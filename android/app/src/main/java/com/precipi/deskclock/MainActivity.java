package com.precipi.deskclock;

import android.Manifest;
import android.content.Context;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int REQ_MIC = 1001;

    // 폴드 경첩 각도 센서 — 존재 여부 자체가 '폴드 단말' 신호. 각도(0=닫힘~180=평평)를 웹에 전달.
    private SensorManager sensorManager;
    private Sensor hingeSensor;
    private volatile float hingeAngle = -1f;   // -1 = 아직 값 없음

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        if (sensorManager != null) {
            hingeSensor = sensorManager.getDefaultSensor(Sensor.TYPE_HINGE_ANGLE);
        }
        // 데스크 클락: 화면이 꺼지지 않게 유지
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        // 컷아웃/레터박스 영역에 흰색이 비치지 않도록 배경을 검정으로
        getWindow().getDecorView().setBackgroundColor(Color.BLACK);
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setBackgroundColor(Color.BLACK);
            // 웹(소나 감지)에서 화면 밝기를 제어하도록 JS 브리지 노출: window.DeskClock.setBrightness("0.01")
            getBridge().getWebView().addJavascriptInterface(new BrightnessBridge(), "DeskClock");
            // 초음파 소나를 사용자 터치 없이 로드 직후 자동 가동하기 위해
            // 미디어(AudioContext/오디오) 자동재생의 제스처 요구를 해제한다.
            getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
        }
        // 초음파 소나용 마이크 권한을 시작 시 요청 — 허용돼야 WebView getUserMedia가 동작
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                    this, new String[]{ Manifest.permission.RECORD_AUDIO }, REQ_MIC);
        }
        hideSystemUI();
    }

    // 앱이 화면에 있는 동안에만 가로로 표시한다.
    @Override
    public void onResume() {
        super.onResume();
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
        if (sensorManager != null && hingeSensor != null) {
            sensorManager.registerListener(hingeListener, hingeSensor, SensorManager.SENSOR_DELAY_NORMAL);
        }
    }

    // 앱을 벗어날 때는 방향 요청을 해제해, 기기가 원래(실행 전) 방향으로 돌아가게 한다.
    @Override
    public void onPause() {
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        if (sensorManager != null) sensorManager.unregisterListener(hingeListener);
        super.onPause();
    }

    // 경첩 각도 변화를 웹(FACE 12 폴드 3D 엔진)에 전달 — window.__foldHinge(deg)
    private final SensorEventListener hingeListener = new SensorEventListener() {
        @Override
        public void onSensorChanged(SensorEvent event) {
            if (event.values.length == 0) return;
            hingeAngle = event.values[0];
            final WebView wv = (getBridge() != null) ? getBridge().getWebView() : null;
            if (wv == null) return;
            wv.post(() -> wv.evaluateJavascript(
                    "window.__foldHinge && window.__foldHinge(" + hingeAngle + ")", null));
        }
        @Override
        public void onAccuracyChanged(Sensor sensor, int accuracy) { }
    };

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemUI();
    }

    // 웹에서 호출하는 화면 밝기 제어 브리지.
    // v < 0 이면 시스템 기본(원래대로), 0~1 이면 해당 밝기로 강제(최소~최대).
    private class BrightnessBridge {
        @JavascriptInterface
        public void setBrightness(String value) {
            final float v;
            try { v = Float.parseFloat(value); } catch (Exception e) { return; }
            runOnUiThread(() -> {
                WindowManager.LayoutParams lp = getWindow().getAttributes();
                lp.screenBrightness = v < 0
                        ? WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
                        : Math.max(0.004f, Math.min(1f, v));
                getWindow().setAttributes(lp);
            });
        }

        // 폴드 단말 여부 — 경첩 각도 센서 존재로 판단(웹에서 FACE 12 노출 결정).
        @JavascriptInterface
        public boolean isFoldable() {
            return hingeSensor != null;
        }

        // 마지막으로 읽은 경첩 각도(도). -1 이면 아직 값 없음.
        @JavascriptInterface
        public float hingeAngle() {
            return hingeAngle;
        }
    }

    // 상태바·내비게이션바를 숨긴 몰입형(immersive) 전체화면. 가장자리에서 쓸어내리면 잠깐 나타남.
    private void hideSystemUI() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller =
                new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
        controller.hide(WindowInsetsCompat.Type.systemBars());
        controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}

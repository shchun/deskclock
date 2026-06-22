package com.precipi.deskclock;

import android.Manifest;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int REQ_MIC = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
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
    }

    // 앱을 벗어날 때는 방향 요청을 해제해, 기기가 원래(실행 전) 방향으로 돌아가게 한다.
    @Override
    public void onPause() {
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        super.onPause();
    }

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

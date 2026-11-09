#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use serde_json::{json, Value};
use std::{fs, sync::Mutex};
use tauri::menu::{CheckMenuItem, Menu, MenuItem, Submenu};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{
    LogicalPosition, LogicalSize, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
};
use tauri_plugin_autostart::ManagerExt;

const RATIO: f64 = 2316.0 / 904.0;
struct Clock(Mutex<Value>, Mutex<Option<Drag>>);
#[derive(Clone, Copy)]
struct Drag {
    x: f64,
    y: f64,
    left: i32,
    top: i32,
    scale: f64,
}
fn faces() -> Value {
    serde_json::from_str(include_str!("../faces.json")).unwrap()
}
fn normalize(v: &Value) -> Value {
    let number = |key: &str, min: f64, max: f64, default: f64| {
        v[key]
            .as_f64()
            .filter(|n| n.is_finite())
            .unwrap_or(default)
            .clamp(min, max)
    };
    let width = number("width", 180., 1600., 360.).round();
    let lock = v["lockAspect"] != false;
    let face = v["originalFace"]
        .as_str()
        .filter(|id| faces().as_array().unwrap().iter().any(|f| f["id"] == *id))
        .unwrap_or("face5");
    let color = |key: &str| {
        v[key]
            .as_str()
            .filter(|s| {
                s.len() == 7 && s.starts_with('#') && s[1..].bytes().all(|b| b.is_ascii_hexdigit())
            })
            .unwrap_or("")
            .to_string()
    };
    let mut result = json!({"width":width,"height":if lock {(width/RATIO).round()} else {number("height",60.,1000.,141.).round()},"lockAspect":lock,"compactVersion":1,"readabilityVersion":1,"originalFace":face,"style":if v["style"] == "original" {"original"} else {"widget"},"alwaysOnTop":v["alwaysOnTop"].as_bool().unwrap_or(true),"opacity":number("opacity",0.2,1.,1.),"backgroundOpacity":number("backgroundOpacity",0.,1.,0.96),"foreground":color("foreground"),"background":color("background")});
    for key in ["x", "y"] {
        if let Some(n) = v[key].as_f64().filter(|n| n.is_finite()) {
            result[key] = json!(n.round());
        }
    }
    result
}
fn state_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path().app_config_dir().unwrap().join("widget.json")
}
fn save(app: &tauri::AppHandle, v: &Value) -> Result<(), String> {
    let path = state_path(app);
    fs::create_dir_all(path.parent().unwrap()).map_err(|e| e.to_string())?;
    let temp = path.with_extension("tmp");
    fs::write(&temp, serde_json::to_vec_pretty(v).unwrap()).map_err(|e| e.to_string())?;
    fs::rename(temp, path).map_err(|e| e.to_string())
}
fn snapshot(app: &tauri::AppHandle) -> Value {
    let mut v = app.state::<Clock>().0.lock().unwrap().clone();
    v["faces"] = faces();
    v["aspectRatio"] = json!(RATIO);
    v["autoStart"] = json!(app.autolaunch().is_enabled().unwrap_or(false));
    v
}
fn broadcast(app: &tauri::AppHandle) {
    let script = format!(
        "window.dispatchEvent(new CustomEvent('widget:changed',{{detail:{}}}));",
        snapshot(app)
    );
    for w in app.webview_windows().values() {
        let _ = w.eval(&script);
    }
}
fn bounds(w: &WebviewWindow, v: &mut Value) -> tauri::Result<()> {
    let monitors = w.available_monitors()?;
    let x = v["x"].as_f64().unwrap_or(80.);
    let y = v["y"].as_f64().unwrap_or(80.);
    let monitor = monitors
        .iter()
        .find(|m| {
            let p = m.position().to_logical::<f64>(m.scale_factor());
            let s = m.size().to_logical::<f64>(m.scale_factor());
            x >= p.x && y >= p.y && x < p.x + s.width && y < p.y + s.height
        })
        .or(monitors.first());
    let mut width = v["width"].as_f64().unwrap();
    let mut height = v["height"].as_f64().unwrap();
    let (mut px, mut py) = (x, y);
    if let Some(m) = monitor {
        let area = m.work_area();
        let p = area.position.to_logical::<f64>(m.scale_factor());
        let s = area.size.to_logical::<f64>(m.scale_factor());
        if v["lockAspect"] == true {
            let scale = (s.width / width).min(s.height / height).min(1.);
            width = (width * scale).floor();
            height = (height * scale).floor();
        } else {
            width = width.min(s.width);
            height = height.min(s.height);
        }
        px = x.clamp(p.x, p.x + s.width - width);
        py = y.clamp(p.y, p.y + s.height - height);
    }
    w.set_size(LogicalSize::new(width, height))?;
    w.set_position(LogicalPosition::new(px, py))?;
    v["x"] = json!(px);
    v["y"] = json!(py);
    Ok(())
}
fn apply(app: &tauri::AppHandle, navigate: bool) -> Result<(), String> {
    let w = app.get_webview_window("clock").unwrap();
    let mut v = app.state::<Clock>().0.lock().unwrap().clone();
    w.set_always_on_top(v["alwaysOnTop"] == true)
        .map_err(|e| e.to_string())?;
    bounds(&w, &mut v).map_err(|e| e.to_string())?;
    *app.state::<Clock>().0.lock().unwrap() = v.clone();
    if navigate {
        let page = if v["style"] == "original" {
            "app/index.html"
        } else {
            "desktop/widget.html"
        };
        w.navigate(format!("http://tauri.localhost/{page}").parse().unwrap())
            .map_err(|e| e.to_string())?;
    }
    save(app, &v)?;
    broadcast(app);
    rebuild_menu(app).map_err(|e| e.to_string())?;
    Ok(())
}
fn build_menu(app: &tauri::AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let v = snapshot(app);
    let w = app.get_webview_window("clock").unwrap();
    let toggle = MenuItem::with_id(
        app,
        "toggle",
        if w.is_visible()? {
            "시계 숨기기"
        } else {
            "시계 표시"
        },
        true,
        None::<&str>,
    )?;
    let top = CheckMenuItem::with_id(
        app,
        "top",
        "항상 위에 표시",
        true,
        v["alwaysOnTop"] == true,
        None::<&str>,
    )?;
    let face_menu = Submenu::with_id(app, "faces", "시계 페이스", true)?;
    face_menu.append(&CheckMenuItem::with_id(
        app,
        "widget",
        "민트 LCD 위젯",
        true,
        v["style"] == "widget",
        None::<&str>,
    )?)?;
    for f in faces().as_array().unwrap() {
        let id = f["id"].as_str().unwrap();
        face_menu.append(&CheckMenuItem::with_id(
            app,
            id,
            f["name"].as_str().unwrap(),
            true,
            v["style"] == "original" && v["originalFace"] == id,
            None::<&str>,
        )?)?;
    }
    let sizes = Submenu::with_id(app, "sizes", "크기", true)?;
    for (n, label) in [(240, "작게"), (360, "보통"), (480, "크게")] {
        sizes.append(&MenuItem::with_id(
            app,
            format!("size{n}"),
            format!("{label} · {n} × {}", (n as f64 / RATIO).round()),
            true,
            None::<&str>,
        )?)?;
    }
    let settings = MenuItem::with_id(app, "settings", "설정 열기", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "종료", true, None::<&str>)?;
    Menu::with_items(app, &[&toggle, &top, &face_menu, &sizes, &settings, &quit])
}
fn rebuild_menu(app: &tauri::AppHandle) -> tauri::Result<()> {
    if let Some(t) = app.tray_by_id("tray") {
        t.set_menu(Some(build_menu(app)?))?;
    }
    Ok(())
}
fn choose(app: &tauri::AppHandle, id: &str) -> Result<(), String> {
    if id != "widget" && !faces().as_array().unwrap().iter().any(|f| f["id"] == id) {
        return Err("Unknown face".into());
    }
    let old;
    {
        let state = app.state::<Clock>();
        let mut v = state.0.lock().unwrap();
        old = v["style"].clone();
        v["style"] = json!(if id == "widget" { "widget" } else { "original" });
        if id != "widget" {
            v["originalFace"] = json!(id);
        }
    }
    let changed = app.state::<Clock>().0.lock().unwrap()["style"] != old;
    apply(app, changed)
}
#[tauri::command]
fn get_state(app: tauri::AppHandle) -> Value {
    snapshot(&app)
}
#[tauri::command]
fn update_state(
    app: tauri::AppHandle,
    window: WebviewWindow,
    patch: Value,
) -> Result<Value, String> {
    if window.label() != "settings" {
        return Err("설정 창에서만 변경할 수 있습니다.".into());
    }
    if let Some(on) = patch["autoStart"].as_bool() {
        if on {
            app.autolaunch().enable()
        } else {
            app.autolaunch().disable()
        }
        .map_err(|e| e.to_string())?;
    }
    let old;
    {
        let state = app.state::<Clock>();
        let mut v = state.0.lock().unwrap();
        old = v["style"].clone();
        let mut next = v.clone();
        for (k, val) in patch.as_object().ok_or("Invalid settings")? {
            if k != "x" && k != "y" {
                next[k] = val.clone();
            }
        }
        if next["lockAspect"] != false && patch["height"].is_number() && !patch["width"].is_number()
        {
            next["width"] = json!((patch["height"].as_f64().unwrap() * RATIO).round());
        }
        *v = normalize(&next);
    }
    let changed = app.state::<Clock>().0.lock().unwrap()["style"] != old;
    apply(&app, changed)?;
    Ok(snapshot(&app))
}
fn builder<'a>(
    app: &'a tauri::AppHandle,
    label: &str,
    page: &str,
) -> WebviewWindowBuilder<'a, tauri::Wry, tauri::AppHandle> {
    WebviewWindowBuilder::new(app, label, WebviewUrl::App(page.into()))
        .initialization_script(include_str!("../../desktop/bridge.js"))
        .on_navigation(|url| url.scheme() == "http" && url.host_str() == Some("tauri.localhost"))
}
#[tauri::command]
async fn open_settings(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("settings") {
        w.show().map_err(|e| e.to_string())?;
        w.set_focus().map_err(|e| e.to_string())?;
    } else {
        builder(&app, "settings", "desktop/settings.html")
            .parent(
                &app.get_webview_window("clock")
                    .ok_or("Clock window is unavailable")?,
            )
            .map_err(|e| e.to_string())?
            .always_on_top(true)
            .title("Desk Clock 설정")
            .inner_size(460., 760.)
            .resizable(false)
            .skip_taskbar(true)
            .build()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
#[tauri::command]
fn drag_window(
    app: tauri::AppHandle,
    window: WebviewWindow,
    phase: String,
    x: f64,
    y: f64,
) -> Result<(), String> {
    if window.label() != "clock" || !x.is_finite() || !y.is_finite() {
        return Err("Invalid window".into());
    }
    let state = app.state::<Clock>();
    if phase == "start" {
        let p = window.outer_position().map_err(|e| e.to_string())?;
        *state.1.lock().unwrap() = Some(Drag {
            x,
            y,
            left: p.x,
            top: p.y,
            scale: window.scale_factor().map_err(|e| e.to_string())?,
        });
    } else {
        let drag = *state.1.lock().unwrap();
        if let Some(d) = drag {
            window
                .set_position(tauri::PhysicalPosition::new(
                    d.left + ((x - d.x) * d.scale).round() as i32,
                    d.top + ((y - d.y) * d.scale).round() as i32,
                ))
                .map_err(|e| e.to_string())?;
        }
        if phase == "end" {
            *state.1.lock().unwrap() = None;
        }
    }
    Ok(())
}
#[tauri::command]
fn show_menu(app: tauri::AppHandle, window: WebviewWindow) -> Result<(), String> {
    window
        .popup_menu(&build_menu(&app).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())
}
#[tauri::command]
fn cycle_face(app: tauri::AppHandle, window: WebviewWindow, value: i32) -> Result<(), String> {
    if window.label() != "clock" || ![-1, 1].contains(&value) {
        return Err("Invalid direction".into());
    }
    let v = snapshot(&app);
    let mut ids = vec!["widget".to_string()];
    ids.extend(
        faces()
            .as_array()
            .unwrap()
            .iter()
            .map(|f| f["id"].as_str().unwrap().to_string()),
    );
    let current = if v["style"] == "widget" {
        "widget"
    } else {
        v["originalFace"].as_str().unwrap()
    };
    let i = ids.iter().position(|id| id == current).unwrap_or(0);
    choose(
        &app,
        &ids[(i as i32 + value).rem_euclid(ids.len() as i32) as usize],
    )
}
#[tauri::command]
fn face_changed(app: tauri::AppHandle, window: WebviewWindow, value: String) -> Result<(), String> {
    if window.label() == "clock"
        && snapshot(&app)["style"] == "original"
        && snapshot(&app)["originalFace"] != value
    {
        choose(&app, &value)?;
    }
    Ok(())
}
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(w) = app.get_webview_window("clock") {
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .app_name("deskclock")
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            get_state,
            update_state,
            open_settings,
            drag_window,
            show_menu,
            cycle_face,
            face_changed
        ])
        .setup(|app| {
            let handle = app.handle();
            // Keep the existing Electron login entry, pointing it at the new binary.
            if !cfg!(debug_assertions) && handle.autolaunch().is_enabled().unwrap_or(false) {
                handle.autolaunch().enable()?;
            }
            let current = state_path(handle);
            let old = std::env::var_os("APPDATA")
                .map(std::path::PathBuf::from)
                .map(|p| p.join("deskclock/widget.json"));
            let raw = fs::read_to_string(&current)
                .ok()
                .or_else(|| old.and_then(|p| fs::read_to_string(p).ok()));
            let mut saved = raw
                .and_then(|s| serde_json::from_str::<Value>(&s).ok())
                .filter(Value::is_object)
                .unwrap_or(json!({}));
            if saved["readabilityVersion"] != 1 {
                saved["opacity"] = json!(1.);
                saved["backgroundOpacity"] = json!(0.96);
            }
            if saved["compactVersion"] != 1
                && ((saved["width"] == 640 && saved["height"] == 200)
                    || (saved["width"] == 440 && saved["height"] == 260))
            {
                saved["width"] = json!(360);
                saved["height"] = json!(141);
            }
            let v = normalize(&saved);

            app.manage(Clock(Mutex::new(v.clone()), Mutex::new(None)));
            let page = if v["style"] == "original" {
                "app/index.html"
            } else {
                "desktop/widget.html"
            };
            let w = builder(handle, "clock", page)
                .title("Desk Clock")
                .inner_size(360., 141.)
                .decorations(false)
                .transparent(true)
                .shadow(false)
                .resizable(false)
                .skip_taskbar(true)
                .visible(false)
                .build()?;
            let mut pixels = vec![0u8; 32 * 32 * 4];
            for y in 0..32 {
                for x in 0..32 {
                    let r = ((x as f64 - 16.).powi(2) + (y as f64 - 16.).powi(2)).sqrt();
                    let hand = ((x as i32 - 16).abs() < 2 && y > 7 && y < 18)
                        || (y > 14 && y < 18 && x > 15 && x < 24);
                    let c = if (r > 12. && r < 15.) || hand {
                        255
                    } else {
                        40
                    };
                    let i = (y * 32 + x) * 4;
                    pixels[i..i + 4].copy_from_slice(&[c, c, c, if r < 15. { 255 } else { 0 }]);
                }
            }
            TrayIconBuilder::with_id("tray")
                .icon(tauri::image::Image::new_owned(pixels, 32, 32))
                .tooltip("Desk Clock")
                .menu(&build_menu(handle)?)
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|t, e| {
                    if matches!(
                        e,
                        TrayIconEvent::DoubleClick {
                            button: MouseButton::Left,
                            ..
                        } | TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        }
                    ) {
                        if let Some(w) = t.app_handle().get_webview_window("clock") {
                            let _ = w.show();
                            let _ = rebuild_menu(t.app_handle());
                        }
                    }
                })
                .build(app)?;
            apply(handle, false).map_err(std::io::Error::other)?;
            w.show()?;
            // Re-clamp when monitors are connected, removed, or their work areas change.
            let monitor_app = handle.clone();
            std::thread::spawn(move || {
                let mut previous = Vec::new();
                loop {
                    std::thread::sleep(std::time::Duration::from_secs(3));
                    let Some(w) = monitor_app.get_webview_window("clock") else {
                        break;
                    };
                    let Ok(monitors) = w.available_monitors() else {
                        continue;
                    };
                    let signature: Vec<_> = monitors
                        .iter()
                        .map(|m| {
                            let a = m.work_area();
                            (
                                a.position.x,
                                a.position.y,
                                a.size.width,
                                a.size.height,
                                m.scale_factor().to_bits(),
                            )
                        })
                        .collect();
                    if !previous.is_empty() && signature != previous {
                        let app = monitor_app.clone();
                        let _ = monitor_app.run_on_main_thread(move || {
                            let _ = apply(&app, false);
                        });
                    }
                    previous = signature;
                }
            });
            Ok(())
        })
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();
            let result = match id {
                "quit" => {
                    app.exit(0);
                    Ok(())
                }
                "settings" => {
                    let app = app.clone();
                    tauri::async_runtime::spawn(async move {
                        if let Err(e) = open_settings(app).await {
                            eprintln!("{e}");
                        }
                    });
                    Ok(())
                }
                "toggle" => {
                    let w = app.get_webview_window("clock").unwrap();
                    let _ = if w.is_visible().unwrap_or(true) {
                        w.hide()
                    } else {
                        w.show()
                    };
                    rebuild_menu(app).map_err(|e| e.to_string())
                }
                "top" => {
                    {
                        let state = app.state::<Clock>();
                        let mut v = state.0.lock().unwrap();
                        v["alwaysOnTop"] = json!(v["alwaysOnTop"] != true);
                    }
                    apply(app, false)
                }
                _ if id.starts_with("size") => {
                    {
                        let state = app.state::<Clock>();
                        let mut v = state.0.lock().unwrap();
                        let n = id[4..].parse::<f64>().unwrap_or(360.);
                        v["width"] = json!(n);
                        v["height"] = json!((n / RATIO).round());
                        v["lockAspect"] = json!(true);
                    }
                    apply(app, false)
                }
                _ => choose(app, id),
            };
            if let Err(e) = result {
                eprintln!("{e}");
            }
        })
        .on_window_event(|w, event| {
            if w.label() != "clock" {
                return;
            }
            if matches!(event, tauri::WindowEvent::CloseRequested { .. }) {
                w.app_handle().exit(0);
                return;
            }
            if let tauri::WindowEvent::Moved(p) = event {
                let app = w.app_handle();
                let state = app.state::<Clock>();
                let mut v = state.0.lock().unwrap();
                let p = p.to_logical::<f64>(w.scale_factor().unwrap_or(1.));
                v["x"] = json!(p.x);
                v["y"] = json!(p.y);
                let _ = save(app, &v);
            }
        })
        .build(tauri::generate_context!())
        .expect("Desk Clock startup failed")
        .run(|app, event| {
            if let tauri::RunEvent::Exit = event {
                let _ = save(app, &app.state::<Clock>().0.lock().unwrap());
            }
        });
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn validates_settings_and_aspect_ratio() {
        let v = normalize(
            &json!({"width":800,"height":60,"foreground":"invalid","opacity":0,"originalFace":"bad"}),
        );
        assert_eq!(v["height"], 312.);
        assert_eq!(v["opacity"], 0.2);
        assert_eq!(v["foreground"], "");
        assert_eq!(v["originalFace"], "face5");
    }
    #[test]
    fn free_aspect_and_saved_position() {
        let v = normalize(&json!({"lockAspect":false,"height":60,"width":180,"x":-100.,"y":45.}));
        assert_eq!(v["height"], 60.);
        assert_eq!(v["x"], -100.);
    }
}

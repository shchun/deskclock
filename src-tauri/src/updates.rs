use std::{sync::Mutex, time::Duration};
use tauri::{AppHandle, Manager};
use tauri_plugin_updater::{Update, UpdaterExt};

enum Status {
    Idle,
    Checking,
    Available(Update),
    Current,
    Installing,
    Failed,
}

pub struct Updates(Mutex<Status>);

impl Updates {
    pub fn setup(app: &AppHandle) {
        let installed = std::env::current_exe()
            .ok()
            .and_then(|exe| exe.parent().map(|dir| dir.join("deskclock-installed")))
            .is_some_and(|marker| marker.is_file());
        if installed && app.config().plugins.0.contains_key("updater") {
            app.manage(Self(Mutex::new(Status::Idle)));
        }
    }

    pub fn menu_item(&self) -> (&'static str, String, bool) {
        match &*self.0.lock().unwrap() {
            Status::Idle => ("check_update", "업데이트 확인".into(), true),
            Status::Checking => ("check_update", "업데이트 확인 중…".into(), false),
            Status::Available(update) => (
                "install_update",
                format!("업데이트 설치 ({})", update.version),
                true,
            ),
            Status::Current => ("check_update", "최신 버전 · 다시 확인".into(), true),
            Status::Installing => ("install_update", "업데이트 설치 중…".into(), false),
            Status::Failed => ("check_update", "업데이트 실패 · 다시 확인".into(), true),
        }
    }
}

fn refresh_menu(app: &AppHandle) {
    let handle = app.clone();
    let _ = app.run_on_main_thread(move || {
        let _ = super::rebuild_menu(&handle);
    });
}

pub fn check(app: &AppHandle) {
    let Some(updates) = app.try_state::<Updates>() else {
        return;
    };
    {
        let mut status = updates.0.lock().unwrap();
        if !matches!(*status, Status::Idle | Status::Current | Status::Failed) {
            return;
        }
        *status = Status::Checking;
    }
    refresh_menu(app);
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        let result = async {
            let handle = app.clone();
            app.updater_builder()
                .timeout(Duration::from_secs(15))
                // The installer can fail to launch. Keep the tray and windows available for retry.
                .on_before_exit(move || {
                    let clock = handle.state::<super::Clock>();
                    let settings = clock.0.lock().unwrap();
                    if let Err(error) = super::save(&handle, &settings) {
                        eprintln!("Could not save settings before updating: {error}");
                    }
                })
                .build()?
                .check()
                .await
        }
        .await;
        let status = match result {
            Ok(Some(update)) => Status::Available(update),
            Ok(None) => Status::Current,
            Err(error) => {
                eprintln!("Update check failed: {error}");
                Status::Failed
            }
        };
        *app.state::<Updates>().0.lock().unwrap() = status;
        refresh_menu(&app);
    });
}

pub fn install(app: &AppHandle) {
    let Some(updates) = app.try_state::<Updates>() else {
        return;
    };
    let update = {
        let mut status = updates.0.lock().unwrap();
        match std::mem::replace(&mut *status, Status::Installing) {
            Status::Available(mut update) => {
                update.timeout = Some(Duration::from_secs(300));
                update
            }
            previous => {
                *status = previous;
                return;
            }
        }
    };
    refresh_menu(app);
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(error) = update.download_and_install(|_, _| {}, || {}).await {
            eprintln!("Update installation failed: {error}");
            *app.state::<Updates>().0.lock().unwrap() = Status::Failed;
            refresh_menu(&app);
        }
    });
}

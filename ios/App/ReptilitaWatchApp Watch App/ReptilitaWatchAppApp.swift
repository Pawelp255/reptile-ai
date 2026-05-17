//
//  ReptilitaWatchAppApp.swift
//  ReptilitaWatchApp Watch App
//
//  Created by p on 2026-05-16.
//

import SwiftUI

@main
struct ReptilitaWatchApp_Watch_AppApp: App {
    @StateObject private var session = WatchCareSession()

    var body: some Scene {
        WindowGroup {
            WatchCareTodayView()
                .environmentObject(session)
        }
    }
}

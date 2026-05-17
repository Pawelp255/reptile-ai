//
//  ContentView.swift
//  ReptilitaWatchApp Watch App
//
//  Created by p on 2026-05-16.
//

import SwiftUI

struct ContentView: View {
    var body: some View {
        WatchCareTodayView()
    }
}

#Preview {
    ContentView()
        .environmentObject(WatchCareSession())
}

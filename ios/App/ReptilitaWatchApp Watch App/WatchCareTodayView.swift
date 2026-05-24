import SwiftUI

struct WatchCareTodayView: View {
    @EnvironmentObject private var session: WatchCareSession

    var body: some View {
        NavigationStack {
            List {
                if let snapshot = session.snapshot {
                    Section {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(snapshot.animalName ?? "Today")
                                .font(.headline)

                            HStack(spacing: 10) {
                                metric("Overdue", value: snapshot.overdueCount, tint: snapshot.overdueCount > 0 ? .orange : .secondary)
                                metric("Due", value: snapshot.dueTodayCount, tint: .teal)
                                metric("Done", value: snapshot.completedTodayCount, tint: .green)
                            }

                            if let lastUpdatedText = session.lastUpdatedText {
                                Text(lastUpdatedText)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }

                    Section("Next") {
                        if let task = snapshot.nextImportantTask {
                            HStack(spacing: 8) {
                                Image(systemName: task.systemImage)
                                    .foregroundStyle(task.isOverdue ? .orange : .teal)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(task.title)
                                        .font(.headline)
                                    Text(task.animalName ?? snapshot.animalName ?? "Reptile")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        } else {
                            Label("All clear", systemImage: "checkmark.circle")
                                .foregroundStyle(.secondary)
                        }
                    }

                    Section("Quick Actions") {
                        ForEach(WatchCareAction.allCases) { action in
                            Button {
                                session.quickComplete(action)
                            } label: {
                                HStack {
                                    Label(action.title, systemImage: action.systemImage)
                                    Spacer()
                                    if isActionPending {
                                        ProgressView()
                                    }
                                }
                            }
                            .disabled(isActionPending)
                        }
                    }
                } else {
                    ContentUnavailableView(session.debugStatus, systemImage: "iphone")
                    Text("Open Reptilita on iPhone")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                Section("Debug") {
                    debugRow("Activation", session.activationStateText)
                    debugRow("Reachable", session.isReachable ? "true" : "false")
                    debugRow("Last request", session.lastRequestSentAt ?? "never")
                    debugRow("Last snapshot", session.lastSnapshotReceivedAt ?? "never")
                    debugRow("Last receive channel", session.lastReceiveChannel ?? "never")
                    debugRow("Last raw keys", session.lastRawPayloadKeys ?? "none")
                    debugRow("Last raw JSON", session.lastRawPayloadJSON ?? "none")
                    debugRow("Decode error", session.lastDecodeError ?? "none")
                }
            }
            .navigationTitle("Today")
            .onAppear {
                session.requestSnapshot()
            }
        }
    }

    private func metric(_ title: String, value: Int, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Text("\(value)")
                .font(.headline)
                .foregroundStyle(tint)
            Text(title)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }

    private var isActionPending: Bool {
        !session.pendingActionIds.isEmpty
    }

    private func debugRow(_ title: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.caption2.monospaced())
                .lineLimit(3)
        }
    }
}

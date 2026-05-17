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
                                Image(systemName: task.taskType.systemImage)
                                    .foregroundStyle(task.isOverdue ? .orange : .teal)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(task.taskType.title)
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
                    ContentUnavailableView("Open Reptilita on iPhone", systemImage: "iphone")
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
}

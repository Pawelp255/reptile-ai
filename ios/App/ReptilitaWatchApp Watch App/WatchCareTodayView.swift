import SwiftUI

struct WatchCareTodayView: View {
    @EnvironmentObject private var session: WatchCareSession

    var body: some View {
        NavigationStack {
            List {
                if let snapshot = session.snapshot {
                    Section {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("\(snapshot.tasks.count) due today")
                                .font(.headline)
                            Text("\(snapshot.overdueCount) overdue")
                                .font(.caption)
                                .foregroundStyle(snapshot.overdueCount > 0 ? .orange : .secondary)
                        }
                    }

                    if snapshot.tasks.isEmpty {
                        ContentUnavailableView("All clear", systemImage: "checkmark.circle")
                    } else {
                        Section("Care") {
                            ForEach(snapshot.tasks) { task in
                                Button {
                                    session.complete(task)
                                } label: {
                                    HStack(spacing: 8) {
                                        Image(systemName: iconName(for: task.taskKind))
                                            .foregroundStyle(task.isOverdue ? .orange : .teal)
                                        VStack(alignment: .leading) {
                                            Text(task.reptileName)
                                                .font(.headline)
                                            Text(task.label)
                                                .font(.caption)
                                                .foregroundStyle(.secondary)
                                        }
                                        Spacer()
                                        if session.pendingTaskIds.contains(task.id) {
                                            ProgressView()
                                        } else {
                                            Image(systemName: "checkmark")
                                        }
                                    }
                                }
                            }
                        }
                    }

                    Section("Summary") {
                        LabeledContent("Completed", value: "\(snapshot.dailySummary.completedTodayCount)")
                        LabeledContent("Due", value: "\(snapshot.dailySummary.dueTodayCount)")
                    }
                } else {
                    ContentUnavailableView("Open Reptilita on iPhone", systemImage: "iphone")
                }
            }
            .navigationTitle("Today")
        }
    }

    private func iconName(for taskKind: WatchCareTaskKind) -> String {
        switch taskKind {
        case .feeding:
            return "fork.knife"
        case .misting:
            return "humidity"
        case .cleaning:
            return "sparkles"
        case .weightCheck:
            return "scalemass"
        }
    }
}

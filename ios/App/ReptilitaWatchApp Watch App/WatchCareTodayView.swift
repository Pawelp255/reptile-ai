import SwiftUI

struct WatchCareTodayView: View {
    @EnvironmentObject private var session: WatchCareSession

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 10) {
                    if let snapshot = session.snapshot {
                        summary(snapshot)
                        nextTask(snapshot)
                        quickActions
                    } else {
                        emptyState
                    }
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 8)
            }
            .background(Color.black)
            .navigationTitle("Today")
            .onAppear {
                session.requestSnapshot()
            }
        }
    }

    private func summary(_ snapshot: WatchCareSnapshot) -> some View {
        VStack(spacing: 10) {
            HStack(alignment: .center, spacing: 12) {
                progressRing(snapshot)

                VStack(alignment: .leading, spacing: 4) {
                    Text(snapshot.animalName ?? "Today")
                        .font(.headline.weight(.semibold))
                        .lineLimit(1)
                    Text(session.lastSyncedText ?? "Syncing...")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    if session.isLoading {
                        ProgressView()
                            .controlSize(.mini)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            HStack(spacing: 6) {
                statCard("Overdue", value: snapshot.overdueCount, tint: snapshot.overdueCount > 0 ? .orange : .secondary)
                statCard("Due", value: snapshot.dueTodayCount, tint: .teal)
                statCard("Done", value: snapshot.completedTodayCount, tint: .green)
            }
        }
        .padding(10)
        .background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(.white.opacity(0.08), lineWidth: 1)
        )
        .animation(.snappy(duration: 0.25), value: snapshot.completedTodayCount)
    }

    private func progressRing(_ snapshot: WatchCareSnapshot) -> some View {
        let total = max(snapshot.overdueCount + snapshot.dueTodayCount + snapshot.completedTodayCount, 1)
        let progress = Double(snapshot.completedTodayCount) / Double(total)

        return ZStack {
            Circle()
                .stroke(.white.opacity(0.12), lineWidth: 8)
            Circle()
                .trim(from: 0, to: progress)
                .stroke(
                    LinearGradient(colors: [.teal, .green], startPoint: .topLeading, endPoint: .bottomTrailing),
                    style: StrokeStyle(lineWidth: 8, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
            VStack(spacing: 0) {
                Text("\(Int((progress * 100).rounded()))%")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                Text("done")
                    .font(.system(size: 9, weight: .medium))
                    .foregroundStyle(.secondary)
            }
        }
        .frame(width: 72, height: 72)
        .accessibilityLabel("Care progress \(Int((progress * 100).rounded())) percent")
    }

    private func statCard(_ title: String, value: Int, tint: Color) -> some View {
        VStack(spacing: 2) {
            Text("\(value)")
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(tint)
                .contentTransition(.numericText())
            Text(title)
                .font(.system(size: 9, weight: .medium))
                .foregroundStyle(.secondary)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 7)
        .background(.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private func nextTask(_ snapshot: WatchCareSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 7) {
            Text("Next")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)

            if let task = snapshot.nextImportantTask {
                HStack(spacing: 8) {
                    Image(systemName: task.systemImage)
                        .font(.body.weight(.semibold))
                        .foregroundStyle(task.isOverdue ? .orange : .teal)
                        .frame(width: 24, height: 24)
                        .background((task.isOverdue ? Color.orange : Color.teal).opacity(0.16), in: Circle())

                    VStack(alignment: .leading, spacing: 1) {
                        Text(task.title)
                            .font(.subheadline.weight(.semibold))
                        Text(task.animalName ?? snapshot.animalName ?? "Care task")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                    Spacer(minLength: 0)
                }
            } else {
                Label("All clear", systemImage: "checkmark.circle.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.green)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var quickActions: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text("Quick Actions")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)

            HStack(spacing: 6) {
                ForEach(WatchCareAction.allCases) { action in
                    Button {
                        session.quickComplete(action)
                    } label: {
                        VStack(spacing: 3) {
                            if isActionPending {
                                ProgressView()
                                    .controlSize(.mini)
                            } else {
                                Image(systemName: action.systemImage)
                                    .font(.body.weight(.semibold))
                            }
                            Text(action.title)
                                .font(.system(size: 10, weight: .semibold))
                                .lineLimit(1)
                                .minimumScaleFactor(0.8)
                        }
                        .frame(maxWidth: .infinity, minHeight: 46)
                    }
                    .buttonStyle(.bordered)
                    .tint(action.tint)
                    .disabled(isActionPending)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var emptyState: some View {
        VStack(spacing: 10) {
            if session.isLoading {
                ProgressView()
                    .controlSize(.regular)
                Text("Syncing with iPhone")
                    .font(.headline.weight(.semibold))
            } else {
                Image(systemName: "iphone")
                    .font(.system(size: 28, weight: .semibold))
                    .foregroundStyle(.teal)
                Text(session.statusText)
                    .font(.headline.weight(.semibold))
            }

            Text("Open Reptilita on iPhone to refresh today’s care.")
                .font(.caption)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, minHeight: 150)
        .padding(14)
        .background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private var isActionPending: Bool {
        !session.pendingActionIds.isEmpty
    }
}

private extension WatchCareAction {
    var tint: Color {
        switch self {
        case .feed:
            return .teal
        case .clean:
            return .green
        case .mist:
            return .cyan
        }
    }
}

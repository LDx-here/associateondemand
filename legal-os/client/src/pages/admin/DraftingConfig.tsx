import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { DashboardLayout } from "../../components/admin/DashboardLayout";

export default function DraftingConfig() {
  const configs = trpc.drafting.listConfigs.useQuery();
  const models = trpc.drafting.listModels.useQuery();
  const update = trpc.drafting.updateConfig.useMutation({ onSuccess: () => configs.refetch() });
  const [taskType, setTaskType] = useState("motion_to_dismiss");

  return (
    <DashboardLayout title="Drafting Config">
      <p className="mb-4 text-sm text-[var(--color-secondary)]">
        Per-task model selection fixes drafting quality (Section 9 of strategy). Default: Claude with extended thinking.
      </p>
      <div className="card mb-6 space-y-4 max-w-lg">
        <div>
          <label className="label">Task type</label>
          <input className="input" value={taskType} onChange={(e) => setTaskType(e.target.value)} />
        </div>
        <div>
          <label className="label">Model</label>
          <select
            className="input"
            id="model-select"
            defaultValue="claude"
            onChange={(e) =>
              update.mutate({
                taskType,
                preferredModel: e.target.value as "claude" | "gpt",
                systemPrompt:
                  "You are an experienced litigation associate attorney drafting a motion for a law firm client.",
              })
            }
          >
            <option value="claude">Claude (recommended)</option>
            <option value="gpt">GPT-4o</option>
          </select>
        </div>
        <p className="text-xs">Available: {(models.data ?? []).join(", ")}</p>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">Task type</th>
            <th className="py-2">Model</th>
            <th className="py-2">Temperature</th>
          </tr>
        </thead>
        <tbody>
          {(configs.data ?? []).map((c) => (
            <tr key={c.id} className="border-b">
              <td className="py-2">{c.taskType}</td>
              <td className="py-2">{c.preferredModel}</td>
              <td className="py-2">{c.temperature}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DashboardLayout>
  );
}

// ChannelEditorModal — extracted from Channels.tsx so the main page can
// stay under 800 lines and stay focused on data flow. The modal owns its
// own form state and exposes a `onSave(form)` callback. The parent owns
// the actual API call so the success / error toast can be wired there.
import React, { useEffect, useState } from "react";
import { useLang } from "../lib/LanguageContext";
import { api, type ApiChannel } from "../lib/api";
import { JsonEditorField } from "../components/ui/FormFields";
import { GroupCombobox } from "../components/ui/GroupCombobox";
import { SelectMenu } from "../components/ui/SelectMenu";

export type ChannelFormState = {
  name: string;
  key: string;
  type: number;
  base_url: string;
  models: string;
  group: string;
  priority: number;
  weight: number;
  openai_organization: string;
  test_model: string;
  remark: string;
  model_mapping: string;
  param_override: string;
  header_override: string;
  setting: string;
};

const EMPTY_FORM: ChannelFormState = {
  name: "",
  key: "",
  type: 1,
  base_url: "",
  models: "",
  group: "",
  priority: 0,
  weight: 1,
  openai_organization: "",
  test_model: "",
  remark: "",
  model_mapping: "",
  param_override: "",
  header_override: "",
  setting: "",
};

function deriveInitialForm(channel?: ApiChannel | null): ChannelFormState {
  if (!channel) return EMPTY_FORM;
  return {
    name: channel.name ?? "",
    key: "",
    type: channel.type ?? 1,
    base_url: channel.base_url ?? "",
    models: Array.isArray(channel.models)
      ? (channel.models as string[]).join(",")
      : (channel.models ?? "") as string,
    group: channel.group ?? "",
    priority: channel.priority ?? 0,
    weight: channel.weight ?? 1,
    openai_organization: channel.openai_organization ?? "",
    test_model: channel.test_model ?? "",
    remark: channel.remark ?? "",
    model_mapping: channel.model_mapping ?? "",
    param_override: channel.param_override ?? "",
    header_override: channel.header_override ?? "",
    setting: channel.settings ?? "",
  };
}

type Props = {
  editing: ApiChannel | null | undefined;
  groups: string[];
  onCancel: () => void;
  onSave: (form: ChannelFormState, isCreate: boolean) => Promise<void>;
  isOperating: boolean;
};

export function ChannelEditorModal({
  editing,
  groups,
  onCancel,
  onSave,
  isOperating,
}: Props) {
  const { t } = useLang();
  const [form, setForm] = useState<ChannelFormState>(deriveInitialForm(editing));
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setForm(deriveInitialForm(editing));
    setValidationError(null);
  }, [editing]);

  // We want to keep groups synced from the parent, but we also want to
  // suggest the channel's current group in the datalist even if it was
  // created before the user opened the editor.
  const knownGroups = new Set<string>(groups);
  if (editing?.group) knownGroups.add(editing.group);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isInteger(form.priority) || form.priority < 0 || form.priority > 100000) {
      setValidationError(t("Priority must be an integer between 0 and 100000.", "优先级必须是 0 到 100000 之间的整数。"));
      return;
    }
    if (!Number.isFinite(form.weight) || form.weight <= 0 || form.weight > 100000) {
      setValidationError(t("Weight must be between 0 and 100000.", "权重必须大于 0 且不超过 100000。"));
      return;
    }
    const jsonFields: Array<[keyof ChannelFormState, string]> = [
      ["model_mapping", t("Model mapping JSON", "模型映射 JSON")],
      ["param_override", t("Parameter override JSON", "参数覆盖 JSON")],
      ["header_override", t("Header override JSON", "请求头覆盖 JSON")],
      ["setting", t("Additional settings JSON", "额外设置 JSON")],
    ];
    for (const [key, label] of jsonFields) {
      if (String(form[key]).trim() === "") continue;
      try {
        JSON.parse(String(form[key]));
      } catch {
        setValidationError(`${label}: ${t("invalid JSON", "JSON 格式无效")}`);
        return;
      }
    }
    setValidationError(null);
    await onSave(form, !editing);
  }

  const textFields: Array<{
    key: keyof ChannelFormState;
    en: string;
    zh: string;
    required?: boolean;
  }> = [
    { key: "name", en: "Name", zh: "名称", required: true },
    {
      key: "key",
      en: "API Key",
      zh: "API 密钥",
      required: !editing,
    },
    { key: "base_url", en: "Base URL", zh: "基础地址" },
    { key: "models", en: "Models", zh: "模型列表" },
    { key: "group", en: "Group", zh: "分组" },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-inverse/40 p-3 sm:p-6">
      <form
        onSubmit={handleSubmit}
        className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl space-y-5 overflow-y-auto border border-[#121110]/10 bg-primary p-4 shadow-xl sm:max-h-[calc(100dvh-3rem)] sm:p-6 md:p-8"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">
            {editing
              ? t("Edit Channel", "编辑渠道")
              : t("Add Channel", "添加渠道")}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onCancel}
            className="font-mono text-overline"
          >
            ×
          </button>
        </div>
        {validationError && (
          <p role="alert" className="border-l-2 border-red-700 bg-red-50 px-3 py-2 text-caption text-red-700">
            {validationError}
          </p>
        )}
        <div className="border-t border-[#121110]/10 pt-4">
          <h3 className="mb-4 text-overline font-mono uppercase tracking-widest text-muted">{t("Basic information", "基础信息")}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {textFields.map(({ key, en, zh, required }) => (
            <label
              key={key}
              className="space-y-1 text-overline font-mono uppercase"
            >
              <span>{t(en, zh)}</span>
              {key === "group" ? (
                <GroupCombobox
                  value={form.group}
                  placeholder={t("Select a group", "选择分组")}
                  options={Array.from(knownGroups).map((group) => ({ value: group, label: group }))}
                  onChange={(group) => setForm((current) => ({ ...current, group }))}
                />
              ) : (
                <input
                  required={Boolean(required)}
                  value={form[key] as string | number}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                />
              )}
            </label>
          ))}
          <label className="space-y-1 text-overline font-mono uppercase">
            <span>{t("Type", "类型")}</span>
            <input
              type="number"
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  type: Number(event.target.value),
                }))
              }
              className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
            />
          </label>
          <label className="space-y-1 text-overline font-mono uppercase">
            <span>{t("Priority", "优先级")}</span>
            <input
              type="number"
              value={form.priority}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  priority: Number(event.target.value),
                }))
              }
              className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
            />
          </label>
          <label className="space-y-1 text-overline font-mono uppercase">
            <span>{t("Weight", "权重")}</span>
            <input
              type="number"
              value={form.weight}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  weight: Number(event.target.value),
                }))
              }
              className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
            />
          </label>
        </div>
        </div>
        <div className="grid gap-4 border-t border-[#121110]/10 pt-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <h3 className="mb-1 text-overline font-mono uppercase tracking-widest text-muted">{t("Routing and advanced settings", "路由与高级设置")}</h3>
            <p className="mb-3 text-caption text-muted">{t("Configure model routing, upstream behavior, and JSON overrides.", "配置模型路由、上游行为和 JSON 覆盖项。")}</p>
          </div>
          {([
            ["openai_organization", "Organization", "组织标识"],
            ["test_model", "Test model", "测试模型"],
            ["remark", "Remark", "备注"],
            ["model_mapping", "Model mapping JSON", "模型映射 JSON"],
          ] as const).map(([key, en, zh]) => (
            <label key={key} className="space-y-1 text-overline font-mono uppercase">
              <span>{t(en, zh)}</span>
              <input
                value={form[key]}
                onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
              />
            </label>
          ))}
          {([
            ["param_override", "Parameter override JSON", "参数覆盖 JSON"],
            ["header_override", "Header override JSON", "请求头覆盖 JSON"],
            ["setting", "Additional settings JSON", "额外设置 JSON"],
          ] as const).map(([key, en, zh]) => (
            <div key={key} className="sm:col-span-2">
              <JsonEditorField label={t(en, zh)} value={form[key]} onChange={(value) => setForm((current) => ({ ...current, [key]: value }))} />
            </div>
          ))}
        </div>
        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-[#121110]/10 bg-primary/95 pt-4 backdrop-blur-sm">
          <button
            type="button"
            onClick={onCancel}
            className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase"
          >
            {t("Cancel", "取消")}
          </button>
          <button
            type="submit"
            disabled={isOperating}
            className="bg-inverse px-5 py-2 text-overline font-mono uppercase text-white disabled:opacity-50"
          >
            {isOperating
              ? t("Saving...", "保存中...")
              : t("Save", "保存")}
          </button>
        </div>
      </form>
    </div>
  );
}

// Re-export the form state and an initial-form helper for parent callers
// that need to seed state from a fresh list.
export { EMPTY_FORM as CHANNEL_EMPTY_FORM };

// ─────────────────────────────────────────────────────────────────────────
// Tag panel — used by the parent to bulk-tag and bulk-untag channels.
// Kept here so the channel operations page has a single place to look
// when reviewing its action surface.
// ─────────────────────────────────────────────────────────────────────────

type TagPanelProps = {
  channels: ApiChannel[];
  onSubmit: (channelIds: number[], tag: string) => Promise<unknown>;
  onResult: (result: unknown) => void;
  onError: (message: string) => void;
  isOperating: boolean;
};

export function ChannelTagPanel({
  channels,
  onSubmit,
  onResult,
  onError,
  isOperating,
}: TagPanelProps) {
  const { t } = useLang();
  const [channelTag, setChannelTag] = useState("");
  const [newChannelTag, setNewChannelTag] = useState("");
  const [tagAction, setTagAction] = useState<"disable" | "enable">("disable");
  const [targetChannelIds, setTargetChannelIds] = useState("");

  async function handleSubmit() {
    const tag = channelTag.trim();
    if (!tag || !targetChannelIds.trim()) {
      onError(t("Tag and channel IDs are required.", "标签和渠道 ID 不能为空。"));
      return;
    }
    const ids = targetChannelIds
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);
    if (ids.length === 0) {
      onError(t("No valid channel IDs provided.", "没有有效的渠道 ID。"));
      return;
    }
    try {
      const result = await onSubmit(ids, tag);
      onResult(result);
    } catch (cause) {
      onError(
        cause instanceof Error
          ? cause.message
          : t("Tag operation failed.", "标签操作失败。"),
      );
    }
  }

  return (
    <section className="mb-6 border border-[#121110]/10 bg-primary p-5">
      <h3 className="mb-3 text-overline font-mono uppercase tracking-widest text-ink">
        {t("Tag channels", "渠道标签")}
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <label className="space-y-1 text-overline font-mono uppercase">
          <span>{t("Target tag", "目标标签")}</span>
          <input
            value={channelTag}
            onChange={(event) => setChannelTag(event.target.value)}
            className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
          />
        </label>
        <label className="space-y-1 text-overline font-mono uppercase">
          <span>{t("New tag (optional)", "新标签（可选）")}</span>
          <input
            value={newChannelTag}
            onChange={(event) => setNewChannelTag(event.target.value)}
            className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
          />
        </label>
        <label className="space-y-1 text-overline font-mono uppercase">
          <span>{t("Action", "操作")}</span>
          <SelectMenu value={tagAction} onChange={(value) => setTagAction(value as "disable" | "enable")} options={[{ value: "disable", label: t("Disable", "禁用") }, { value: "enable", label: t("Enable", "启用") }]} />
        </label>
        <label className="space-y-1 text-overline font-mono uppercase">
          <span>{t("Channel IDs (comma)", "渠道 ID（逗号分隔）")}</span>
          <input
            value={targetChannelIds}
            onChange={(event) => setTargetChannelIds(event.target.value)}
            className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
          />
        </label>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-caption text-muted">
          {t(
            "Loads above list: ${n} channels",
            `已加载 ${channels.length} 个渠道`,
          )}
        </span>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isOperating}
          className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-50"
        >
          {t("Apply tag", "应用标签")}
        </button>
      </div>
    </section>
  );
}

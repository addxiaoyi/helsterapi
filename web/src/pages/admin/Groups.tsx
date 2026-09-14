import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { api, type ApiGroupConfig } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";

type GroupForm = { name: string; description: string; ratio: string; enabled: boolean };
const emptyForm: GroupForm = { name: "", description: "", ratio: "1", enabled: true };

export default function Groups() {
  const { t } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const [groups, setGroups] = useState<ApiGroupConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ApiGroupConfig | null>(null);
  const [form, setForm] = useState<GroupForm>(emptyForm);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setGroups(await api.groupConfigs()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : t("Unable to load groups.", "无法加载分组。")); }
    finally { setLoading(false); }
  }, [t]);
  useEffect(() => { void load(); }, [load]);

  function resetForm() { setEditing(null); setForm(emptyForm); setFormError(null); }
  function editGroup(group: ApiGroupConfig) { setEditing(group); setFormError(null); setForm({ name: group.name, description: group.description, ratio: String(group.ratio), enabled: group.enabled }); }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ratio = Number(form.ratio);
    const groupName = form.name.trim();
    const validationMessage = !groupName
      ? t("Group name is required.", "请输入分组名称。")
      : groupName.length > 64 || /[,\r\n]/.test(form.name)
        ? t("Group names must be 1-64 characters without commas or new lines.", "分组名称长度须为 1-64 个字符，且不能包含逗号或换行。")
      : !Number.isFinite(ratio) || ratio < 0 || ratio > 100000
          ? t("Ratio must be between 0 and 100000.", "倍率必须在 0 到 100000 之间。")
          : null;
    if (validationMessage) { setFormError(validationMessage); return; }
    setSaving(true); setError(null);
    setFormError(null);
    try {
      const body = { name: form.name.trim(), description: form.description.trim(), ratio, enabled: form.enabled };
      if (editing) await api.updateGroupConfig(editing.name, body); else await api.createGroupConfig(body);
      toast.success({ message: editing ? t("Group updated.", "分组已更新。") : t("Group created.", "分组已创建。") }); resetForm(); await load();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t("Unable to save group.", "分组保存失败。");
      setFormError(message);
    }
    finally { setSaving(false); }
  }

  async function removeGroup(group: ApiGroupConfig) {
    if (!(await confirm({ title: t("Delete group", "删除分组"), description: t(`Delete ${group.name}? Channels using it will block deletion.`, `确定删除 ${group.name}？仍被渠道使用时会阻止删除。`), confirmText: t("Delete", "删除"), variant: "danger" }))) return;
    try { await api.deleteGroupConfig(group.name); toast.success({ message: t("Group deleted.", "分组已删除。") }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : t("Unable to delete group.", "分组删除失败。")); }
  }

  return (
    <PageContainer title={t("Access Groups", "访问分组")} subtitle={t("Manage billing ratios and user-visible access groups.", "管理计费倍率和用户可见的访问分组。") } isLoading={loading} error={error} onRetry={load} actions={<div className="flex flex-wrap gap-2"><button type="button" onClick={() => void load()} disabled={loading} className="flex min-h-9 items-center gap-2 border border-ink/20 px-3 text-caption"><RefreshCw className="h-3.5 w-3.5" />{t("Refresh", "刷新")}</button><button type="button" onClick={resetForm} className="flex min-h-9 items-center gap-2 bg-ink px-3 text-caption text-paper"><Plus className="h-3.5 w-3.5" />{t("New group", "新建分组")}</button></div>}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="min-w-0 border-y border-ink/10 bg-paper/50 p-4 sm:p-6">
          <div className="mb-4 grid grid-cols-[minmax(0,1fr)_5rem_7rem_5rem_4rem] gap-3 border-b border-ink/10 pb-3 text-overline font-mono uppercase tracking-widest text-muted"><span>{t("Group", "分组")}</span><span>{t("Ratio", "倍率")}</span><span>{t("Usage", "使用情况")}</span><span>{t("Status", "状态")}</span><span /></div>
          <div className="space-y-1">{groups.map((group) => <div key={group.name} className="grid min-h-14 grid-cols-[minmax(0,1fr)_5rem_7rem_5rem_4rem] items-center gap-3 border-b border-ink/5 text-caption"><div className="min-w-0"><p className="truncate font-semibold text-ink">{group.name}</p><p className="truncate text-micro text-muted">{group.description || "-"}</p></div><span className="font-pixel">{group.ratio}</span><span className="text-muted">{group.channels} {t("channels", "渠道")}</span><span className={group.enabled ? "text-success" : "text-muted"}>{group.enabled ? t("Enabled", "启用") : t("Hidden", "隐藏")}</span><div className="flex justify-end gap-1"><button type="button" onClick={() => editGroup(group)} title={t("Edit", "编辑")} className="icon-btn"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => void removeGroup(group)} disabled={group.name === "default"} title={t("Delete", "删除")} className="icon-btn text-danger disabled:opacity-30"><Trash2 className="h-4 w-4" /></button></div></div>)}</div>
        </section>
        <form onSubmit={save} className="border border-ink/10 bg-paper p-5 sm:p-6"><h2 className="mb-5 font-serif text-xl text-ink">{editing ? t("Edit group", "编辑分组") : t("New group", "新建分组")}</h2>{formError && <p role="alert" className="mb-4 border-l-2 border-danger bg-red-50 px-3 py-2 text-caption text-danger">{formError}</p>}<div className="space-y-4"><label className="block space-y-1 text-overline font-mono uppercase"><span>{t("Name", "名称")}</span><input required maxLength={64} autoComplete="off" value={form.name} disabled={Boolean(editing)} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border-b border-ink/20 bg-transparent px-1 py-2 text-body outline-none" /></label><label className="block space-y-1 text-overline font-mono uppercase"><span>{t("Description", "显示名称")}</span><input maxLength={160} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border-b border-ink/20 bg-transparent px-1 py-2 text-body outline-none" /></label><label className="block space-y-1 text-overline font-mono uppercase"><span>{t("Ratio", "倍率")}</span><input required min="0" max="100000" step="0.0001" type="number" inputMode="decimal" value={form.ratio} onChange={(e) => setForm({ ...form, ratio: e.target.value })} className="w-full border-b border-ink/20 bg-transparent px-1 py-2 text-body outline-none" /></label><label className="flex items-center gap-2 text-caption"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="accent-ink" />{t("Visible to users", "对用户可见")}</label></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={resetForm} className="min-h-9 border border-ink/20 px-3 text-caption">{t("Reset", "重置")}</button><button type="submit" disabled={saving} className="min-h-9 bg-ink px-4 py-2 text-caption text-paper disabled:opacity-50">{saving ? t("Saving...", "保存中...") : t("Save group", "保存分组")}</button></div></form>
      </div>
    </PageContainer>
  );
}

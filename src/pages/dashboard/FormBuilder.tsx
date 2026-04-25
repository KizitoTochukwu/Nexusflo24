import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useUpdateForm, type FormField } from "@/hooks/useForms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Eye, Code2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FieldLibrary from "@/components/forms/builder/FieldLibrary";
import FormCanvas from "@/components/forms/builder/FormCanvas";
import FieldPropertiesPanel from "@/components/forms/builder/FieldPropertiesPanel";
import FormSettingsPanel from "@/components/forms/builder/FormSettingsPanel";
import PublicFormRenderer from "@/components/forms/PublicFormRenderer";
import EmbedFormDialog from "@/components/forms/EmbedFormDialog";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { toast } from "sonner";

export default function FormBuilder() {
  const { formId } = useParams();
  const workspaceId = useWorkspaceId();
  const navigate = useNavigate();
  const { data: remoteForm, isLoading } = useForm(formId);
  const updateForm = useUpdateForm();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [schema, setSchema] = useState(remoteForm?.schema);
  const [settings, setSettings] = useState(remoteForm?.settings);
  const [theme, setTheme] = useState(remoteForm?.theme);
  const [status, setStatus] = useState<"draft" | "active">("draft");
  const [selStep, setSelStep] = useState(0);
  const [selFieldId, setSelFieldId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (remoteForm) {
      setName(remoteForm.name);
      setDescription(remoteForm.description || "");
      setSchema(remoteForm.schema);
      setSettings(remoteForm.settings);
      setTheme(remoteForm.theme);
      setStatus(remoteForm.status);
    }
  }, [remoteForm]);

  const selectedField = useMemo(() => {
    if (!schema || !selFieldId) return null;
    return schema.steps[selStep]?.fields.find((f) => f.id === selFieldId) ?? null;
  }, [schema, selStep, selFieldId]);

  if (isLoading || !remoteForm || !schema || !settings || !theme) {
    return (
      <DashboardLayout>
        <div className="p-12 text-center text-muted-foreground">Loading form…</div>
      </DashboardLayout>
    );
  }

  const handleSave = async () => {
    await updateForm.mutateAsync({
      id: remoteForm.id,
      name,
      description,
      schema,
      settings,
      theme,
      status,
    } as any);
    toast.success("Form saved");
  };

  const addField = (field: FormField) => {
    setSchema({
      ...schema,
      steps: schema.steps.map((s, i) =>
        i === selStep ? { ...s, fields: [...s.fields, field] } : s,
      ),
    });
    setSelFieldId(field.id);
  };

  const updateField = (next: FormField) => {
    setSchema({
      ...schema,
      steps: schema.steps.map((s, i) =>
        i === selStep
          ? { ...s, fields: s.fields.map((f) => (f.id === next.id ? next : f)) }
          : s,
      ),
    });
  };

  const moveField = (stepIdx: number, fieldId: string, dir: -1 | 1) => {
    setSchema({
      ...schema,
      steps: schema.steps.map((s, i) => {
        if (i !== stepIdx) return s;
        const fields = [...s.fields];
        const idx = fields.findIndex((f) => f.id === fieldId);
        const tgt = idx + dir;
        if (tgt < 0 || tgt >= fields.length) return s;
        [fields[idx], fields[tgt]] = [fields[tgt], fields[idx]];
        return { ...s, fields };
      }),
    });
  };

  const deleteField = (stepIdx: number, fieldId: string) => {
    setSchema({
      ...schema,
      steps: schema.steps.map((s, i) =>
        i === stepIdx ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) } : s,
      ),
    });
    if (selFieldId === fieldId) setSelFieldId(null);
  };

  const addStep = () => {
    const newStep = { id: `step-${Date.now()}`, title: "", fields: [] };
    setSchema({ ...schema, steps: [...schema.steps, newStep] });
    setSelStep(schema.steps.length);
    setSelFieldId(null);
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard/${workspaceId}/forms`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-72 text-base font-semibold"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-md border px-3 py-1.5">
            <Switch
              checked={status === "active"}
              onCheckedChange={(v) => setStatus(v ? "active" : "draft")}
            />
            <Label className="text-xs">{status === "active" ? "Active" : "Draft"}</Label>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowPreview((v) => !v)}>
            <Eye className="mr-1.5 h-4 w-4" /> {showPreview ? "Hide preview" : "Preview"}
          </Button>
          <EmbedFormDialog
            form={{ ...remoteForm, name, status }}
            trigger={
              <Button variant="outline" size="sm">
                <Code2 className="mr-1.5 h-4 w-4" /> Embed
              </Button>
            }
          />
          <Button size="sm" onClick={handleSave} disabled={updateForm.isPending}>
            <Save className="mr-1.5 h-4 w-4" /> Save
          </Button>
        </div>
      </div>

      {/* Workspace */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr_320px]">
        {/* Left: field library */}
        <div className="rounded-xl border bg-card p-3">
          <FieldLibrary onAdd={addField} />
        </div>

        {/* Center: canvas / preview */}
        <div>
          {showPreview ? (
            <div className="rounded-xl border bg-muted/30 p-6">
              <PublicFormRenderer
                preview
                form={{ ...remoteForm, name, description, schema, settings, theme, status }}
              />
            </div>
          ) : (
            <FormCanvas
              schema={schema}
              selectedStepIdx={selStep}
              selectedFieldId={selFieldId}
              onSelectField={(s, f) => { setSelStep(s); setSelFieldId(f); }}
              onSelectStep={(i) => { setSelStep(i); setSelFieldId(null); }}
              onMoveField={moveField}
              onDeleteField={deleteField}
              onAddStep={addStep}
            />
          )}
        </div>

        {/* Right: properties / settings */}
        <div className="rounded-xl border bg-card p-3">
          <Tabs defaultValue={selectedField ? "field" : "form"} value={selectedField ? "field" : "form"} onValueChange={(v) => { if (v === "form") setSelFieldId(null); }}>
            <TabsList className="w-full">
              <TabsTrigger value="field" className="flex-1" disabled={!selectedField}>Field</TabsTrigger>
              <TabsTrigger value="form" className="flex-1">Form</TabsTrigger>
            </TabsList>
            <TabsContent value="field" className="mt-3">
              {selectedField ? (
                <FieldPropertiesPanel field={selectedField} onChange={updateField} />
              ) : (
                <p className="p-4 text-center text-xs text-muted-foreground">Select a field to edit.</p>
              )}
            </TabsContent>
            <TabsContent value="form" className="mt-3">
              <FormSettingsPanel
                description={description}
                settings={settings}
                theme={theme}
                onChangeDescription={setDescription}
                onChangeSettings={setSettings}
                onChangeTheme={setTheme}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}

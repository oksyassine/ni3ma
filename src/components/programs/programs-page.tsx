"use client";

import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { usePermissions } from "@/lib/use-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Section } from "@prisma/client";
import { SECTION_LABELS } from "@/lib/section";
import { useT } from "@/components/i18n/provider";
import { Plus, Calendar, MapPin, Trash2, Upload, Download, ChevronDown } from "lucide-react";

type Activity = {
  id: string;
  title: string;
  description: string | null;
  activityDate: string | null;
  timeStart: string | null;
  timeEnd: string | null;
  location: string | null;
  status: string;
};

type Program = {
  id: string;
  section: Section;
  year: number;
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  activities: Activity[];
};

const STATUS_META: Record<string, { key: string; variant: "default" | "secondary" | "outline" }> = {
  PLANNED: { key: "educational.statusPlanned", variant: "outline" },
  ONGOING: { key: "educational.statusOngoing", variant: "default" },
  DONE: { key: "educational.statusDone", variant: "secondary" },
  CANCELLED: { key: "educational.statusCancelled", variant: "outline" },
};

export function ProgramsPage({ section }: { section: Section }) {
  const { t } = useT();
  const perms = usePermissions();
  const canWrite = perms.canWriteSection(section);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [openProgram, setOpenProgram] = useState(false);
  const [openActivity, setOpenActivity] = useState<string | null>(null);
  const [progForm, setProgForm] = useState({ title: "", description: "", startDate: "", endDate: "" });
  const [actForm, setActForm] = useState({
    title: "",
    description: "",
    activityDate: "",
    timeStart: "",
    timeEnd: "",
    location: "",
    status: "PLANNED",
  });

  const load = async () => {
    setLoading(true);
    const r = await fetch(`/api/programs?section=${section}`);
    if (r.ok) {
      const data = await r.json();
      setPrograms(
        data.map((p: Program & { startDate?: string; endDate?: string; activities: (Activity & { activityDate?: string })[] }) => ({
          ...p,
          startDate: p.startDate ? p.startDate.slice(0, 10) : null,
          endDate: p.endDate ? p.endDate.slice(0, 10) : null,
          activities: p.activities.map((a) => ({
            ...a,
            activityDate: a.activityDate ? a.activityDate.slice(0, 10) : null,
          })),
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [section]);

  const submitProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progForm.title.trim()) {
      toast.error(t("educational.titleRequired"));
      return;
    }
    const r = await fetch("/api/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...progForm, section }),
    });
    if (r.ok) {
      toast.success(t("educational.programCreatedToast"));
      setOpenProgram(false);
      setProgForm({ title: "", description: "", startDate: "", endDate: "" });
      load();
    } else toast.error(t("educational.createFailedToast"));
  };

  const submitActivity = async (e: React.FormEvent, programId: string) => {
    e.preventDefault();
    if (!actForm.title.trim()) {
      toast.error(t("educational.titleRequired"));
      return;
    }
    const r = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...actForm, programId }),
    });
    if (r.ok) {
      toast.success(t("educational.activityAddedToast"));
      setOpenActivity(null);
      setActForm({
        title: "",
        description: "",
        activityDate: "",
        timeStart: "",
        timeEnd: "",
        location: "",
        status: "PLANNED",
      });
      load();
    } else toast.error(t("educational.addFailedToast"));
  };

  const deleteActivity = async (id: string) => {
    if (!confirm(t("educational.deleteActivityConfirm"))) return;
    const r = await fetch(`/api/activities/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success(t("educational.deletedToast"));
      load();
    } else toast.error(t("educational.failedToast"));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("educational.programsTitle", { section: SECTION_LABELS[section] })}</h1>
          <p className="text-muted-foreground">{t("educational.programsSubtitle")}</p>
        </div>
        {canWrite ? (
          <ProgramActionsMenu
            section={section}
            openCreate={() => setOpenProgram(true)}
            onImported={load}
          />
        ) : perms.hasSectionRead(section) ? (
          <Badge variant="outline">{t("educational.readOnly")}</Badge>
        ) : null}
        <Dialog open={openProgram} onOpenChange={setOpenProgram}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("educational.newProgram")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submitProgram} className="space-y-4">
              <div>
                <Label>{t("educational.titleLabel")}</Label>
                <Input value={progForm.title} onChange={(e) => setProgForm({ ...progForm, title: e.target.value })} />
              </div>
              <div>
                <Label>{t("educational.descLabel")}</Label>
                <Textarea value={progForm.description} onChange={(e) => setProgForm({ ...progForm, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("educational.startDate")}</Label>
                  <Input type="date" value={progForm.startDate} onChange={(e) => setProgForm({ ...progForm, startDate: e.target.value })} />
                </div>
                <div>
                  <Label>{t("educational.endDate")}</Label>
                  <Input type="date" value={progForm.endDate} onChange={(e) => setProgForm({ ...progForm, endDate: e.target.value })} />
                </div>
              </div>
              <Button type="submit" className="w-full">{t("educational.create")}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading && <p className="text-center text-muted-foreground">{t("educational.loading")}</p>}

      {!loading && programs.length === 0 && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">{t("educational.noProgramsYet")}</CardContent></Card>
      )}

      <div className="space-y-4">
        {programs.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{p.title}</CardTitle>
                  {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                  <div className="flex gap-3 text-xs text-muted-foreground mt-2">
                    {p.startDate && <span>{p.startDate} ← {p.endDate ?? "..."}</span>}
                    <Badge variant="outline">{p.year}</Badge>
                    <span>{t("educational.activitiesCount", { count: p.activities.length })}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                {canWrite && <ProgramEditButton program={p} reload={load} />}
                {canWrite && <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={async () => {
                  if (!confirm(t("educational.deleteProgramConfirm"))) return;
                  const r = await fetch(`/api/programs/${p.id}`, { method: "DELETE" });
                  if (r.ok) { toast.success(t("educational.deletedToast")); load(); } else toast.error(t("educational.failedToast"));
                }} title={t("educational.deleteTitle")}>
                  <Trash2 size={14} />
                </Button>}
                {canWrite && <Dialog open={openActivity === p.id} onOpenChange={(o) => setOpenActivity(o ? p.id : null)}>
                  <DialogTrigger render={<Button size="sm" variant="outline"><Plus size={14} />{t("educational.activityBtn")}</Button>} />
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("educational.addActivity")}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => submitActivity(e, p.id)} className="space-y-3">
                      <div>
                        <Label>{t("educational.titleLabel")}</Label>
                        <Input value={actForm.title} onChange={(e) => setActForm({ ...actForm, title: e.target.value })} />
                      </div>
                      <div>
                        <Label>{t("educational.descLabel")}</Label>
                        <Textarea value={actForm.description} onChange={(e) => setActForm({ ...actForm, description: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label>{t("educational.date")}</Label>
                          <Input type="date" value={actForm.activityDate} onChange={(e) => setActForm({ ...actForm, activityDate: e.target.value })} />
                        </div>
                        <div>
                          <Label>{t("educational.fromTime")}</Label>
                          <Input type="time" value={actForm.timeStart} onChange={(e) => setActForm({ ...actForm, timeStart: e.target.value })} />
                        </div>
                        <div>
                          <Label>{t("educational.toTime")}</Label>
                          <Input type="time" value={actForm.timeEnd} onChange={(e) => setActForm({ ...actForm, timeEnd: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <Label>{t("educational.locationLabel")}</Label>
                        <Input value={actForm.location} onChange={(e) => setActForm({ ...actForm, location: e.target.value })} />
                      </div>
                      <Button type="submit" className="w-full">{t("educational.add")}</Button>
                    </form>
                  </DialogContent>
                </Dialog>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {p.activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">{t("educational.noActivitiesYet")}</p>
              ) : (
                p.activities.map((a) => {
                  const meta = STATUS_META[a.status];
                  return (
                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                      <div className="flex-1">
                        <div className="font-medium">{a.title}</div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                          {a.activityDate && (
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />{a.activityDate}
                              {a.timeStart && <> · {a.timeStart}{a.timeEnd ? `-${a.timeEnd}` : ""}</>}
                            </span>
                          )}
                          {a.location && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} />{a.location}
                            </span>
                          )}
                        </div>
                      </div>
                      {meta ? <Badge variant={meta.variant}>{t(meta.key)}</Badge> : <Badge variant="outline">{a.status}</Badge>}
                      {canWrite && <ActivityEditButton activity={a} reload={load} />}
                      {canWrite && <Button size="icon" variant="ghost" onClick={() => deleteActivity(a.id)} title={t("educational.deleteTitle")}>
                        <Trash2 size={14} />
                      </Button>}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

const PROGRAM_TEMPLATE_COLS = [
  "programTitle", "programDescription", "programStartDate", "programEndDate",
  "activityTitle", "activityDescription", "activityDate", "timeStart", "timeEnd", "location", "status",
];

function ProgramActionsMenu({
  section,
  openCreate,
  onImported,
}: {
  section: Section;
  openCreate: () => void;
  onImported: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const { t } = useT();

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      PROGRAM_TEMPLATE_COLS,
      ["برنامج رمضان", "أنشطة شهر رمضان", "2026-02-15", "2026-03-15", "إفطار جماعي", "إفطار في المسجد", "2026-02-20", "18:00", "20:00", "المسجد المركزي", "PLANNED"],
      ["برنامج رمضان", "", "", "", "قفة رمضان", "توزيع قفف على الأسر", "2026-02-25", "10:00", "12:00", "مقر الجمعية", "PLANNED"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Programs");
    XLSX.writeFile(wb, `ni3ma-programs-template-${section}.xlsx`);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImporting(true);
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const dryRes = await fetch("/api/programs/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, section, dryRun: true }),
    });
    if (!dryRes.ok) {
      toast.error(t("educational.importVerifyFailedToast"));
      setImporting(false);
      return;
    }
    const dry = await dryRes.json();
    const ok = confirm(
      t("educational.importedConfirm", { programs: dry.programs, activities: dry.activities })
    );
    if (!ok) {
      setImporting(false);
      e.target.value = "";
      return;
    }

    const r = await fetch("/api/programs/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, section, dryRun: false }),
    });
    if (r.ok) {
      const data = await r.json();
      toast.success(t("educational.importedToast", { programs: data.programs, activities: data.activities }));
      onImported();
    } else toast.error(t("educational.importFailedToast"));
    setImporting(false);
    e.target.value = "";
  };

  return (
    <>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      <DropdownMenu>
        <DropdownMenuTrigger render={
          <Button>
            <Plus size={16} />{t("educational.programBtn")}
            <ChevronDown size={14} />
          </Button>
        } />
        <DropdownMenuContent>
          <DropdownMenuItem onClick={openCreate}>
            <Plus size={14} />{t("educational.addManually")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileRef.current?.click()} disabled={importing}>
            <Upload size={14} />{t("educational.importFromExcel")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={downloadTemplate}>
            <Download size={14} />{t("educational.downloadTemplate")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

function ProgramEditButton({ program, reload }: { program: { id: string; title: string; description: string | null; startDate: string | null; endDate: string | null }; reload: () => void }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: program.title,
    description: program.description ?? "",
    startDate: program.startDate ?? "",
    endDate: program.endDate ?? "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error(t("educational.titleRequired"));
    const r = await fetch(`/api/programs/${program.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) { toast.success(t("educational.editedToast")); setOpen(false); reload(); } else toast.error(t("educational.failedToast"));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="icon" variant="ghost" title={t("educational.editTitle")}><Plus size={14} className="rotate-45" /></Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>{t("educational.editProgram")}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>{t("educational.titleLabel")}</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>{t("educational.descLabel")}</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("educational.startDate")}</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
            <div><Label>{t("educational.endDate")}</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
          </div>
          <Button type="submit" className="w-full">{t("educational.saveChanges")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ActivityEditButton({ activity, reload }: { activity: { id: string; title: string; description: string | null; activityDate: string | null; timeStart: string | null; timeEnd: string | null; location: string | null; status: string }; reload: () => void }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: activity.title,
    description: activity.description ?? "",
    activityDate: activity.activityDate ?? "",
    timeStart: activity.timeStart ?? "",
    timeEnd: activity.timeEnd ?? "",
    location: activity.location ?? "",
    status: activity.status,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch(`/api/activities/${activity.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) { toast.success(t("educational.editedToast")); setOpen(false); reload(); } else toast.error(t("educational.failedToast"));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="icon" variant="ghost" title={t("educational.editTitle")}><Plus size={14} className="rotate-45" /></Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>{t("educational.editActivity")}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>{t("educational.titleLabel")}</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>{t("educational.descLabel")}</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>{t("educational.date")}</Label><Input type="date" value={form.activityDate} onChange={(e) => setForm({ ...form, activityDate: e.target.value })} /></div>
            <div><Label>{t("educational.fromTime")}</Label><Input type="time" value={form.timeStart} onChange={(e) => setForm({ ...form, timeStart: e.target.value })} /></div>
            <div><Label>{t("educational.toTime")}</Label><Input type="time" value={form.timeEnd} onChange={(e) => setForm({ ...form, timeEnd: e.target.value })} /></div>
          </div>
          <div><Label>{t("educational.locationLabel")}</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          <div>
            <Label>{t("educational.statusLabel")}</Label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full h-9 px-3 rounded-md border bg-background text-sm">
              <option value="PLANNED">{t("educational.statusPlanned")}</option>
              <option value="ONGOING">{t("educational.statusOngoing")}</option>
              <option value="DONE">{t("educational.statusDone")}</option>
              <option value="CANCELLED">{t("educational.statusCancelled")}</option>
            </select>
          </div>
          <Button type="submit" className="w-full">{t("educational.saveChanges")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import React, { useState } from "react";
import {
  Button,
  Card,
  GlassCard,
  Chip,
  Segmented,
  TimeControlPicker,
  Dialog,
  BottomSheet,
  Toast,
  Skeleton,
  Avatar,
  RatingBadge,
  ThemeToggle,
  Tabs,
  Input,
  Switch,
} from "../components/ui";
import { useTheme } from "../lib/theme";
import { Bot, Swords, Trophy, Zap } from "lucide-react";

export default function DevKit() {
  const { preference, resolved, setTheme } = useTheme();
  const [segVal, setSegVal] = useState("bullet");
  const [tcVal, setTcVal] = useState("3+2");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [tab, setTab] = useState("all");
  const [switchVal, setSwitchVal] = useState(true);
  const [inputVal, setInputVal] = useState("Grandmaster");

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--on-surface)] p-4 sm:p-8 max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[var(--outline)]">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-[var(--on-surface)]">
            Design System Kit
          </h1>
          <p className="text-sm text-[var(--on-surface-variant)] mt-1">
            Material 3 Expressive + Apple Liquid Glass component showcase.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-container)]">
            Theme: {preference} ({resolved})
          </div>
        </div>
      </div>

      {/* 1. Theme Roles & Palette */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold font-heading">1. Color Roles & Palette</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          <div className="p-4 rounded-2xl bg-[var(--primary)] text-[var(--on-primary)] font-bold text-xs flex flex-col justify-between h-24 shadow-sm">
            <span>Primary</span>
            <span className="font-mono">Brand Green</span>
          </div>
          <div className="p-4 rounded-2xl bg-[var(--tertiary)] text-[var(--on-tertiary)] font-bold text-xs flex flex-col justify-between h-24 shadow-sm">
            <span>Tertiary</span>
            <span className="font-mono">Brushed Gold</span>
          </div>
          <div className="p-4 rounded-2xl bg-[var(--surface)] text-[var(--on-surface)] font-bold text-xs flex flex-col justify-between h-24 border border-[var(--outline)]">
            <span>Surface</span>
            <span className="font-mono">Opaque Surface</span>
          </div>
          <div className="p-4 rounded-2xl bg-[var(--surface-container)] text-[var(--on-surface)] font-bold text-xs flex flex-col justify-between h-24 border border-[var(--outline)]">
            <span>Container</span>
            <span className="font-mono">Content BG</span>
          </div>
          <div className="p-4 rounded-2xl bg-[var(--surface-container-high)] text-[var(--on-surface)] font-bold text-xs flex flex-col justify-between h-24 border border-[var(--outline)]">
            <span>Container High</span>
            <span className="font-mono">Interactive High</span>
          </div>
          <div className="p-4 rounded-2xl bg-[var(--error)] text-[var(--on-error)] font-bold text-xs flex flex-col justify-between h-24 shadow-sm">
            <span>Error</span>
            <span className="font-mono">Danger Red</span>
          </div>
        </div>
      </section>

      {/* 2. Buttons */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold font-heading">2. Buttons & States</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="filled">Filled Button</Button>
          <Button variant="tonal">Tonal Button</Button>
          <Button variant="outlined">Outlined Button</Button>
          <Button variant="text">Text Button</Button>
          <Button variant="danger">Danger Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="filled" disabled>Disabled</Button>
          <Button variant="filled" size="sm">Small</Button>
          <Button variant="filled" size="lg">Large Hero</Button>
        </div>
      </section>

      {/* 3. Liquid Glass vs Solid Content Cards */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold font-heading">3. Surfaces & Liquid Glass</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card variant="container">
            <h3 className="font-bold text-base mb-1">Standard Content Card (Solid)</h3>
            <p className="text-sm text-[var(--on-surface-variant)]">
              Board bezels, move lists, profile stats, bot cards. Opaque, high-contrast, no blur.
            </p>
          </Card>

          <GlassCard>
            <h3 className="font-bold text-base mb-1">Liquid Glass (Functional Layer)</h3>
            <p className="text-sm text-[var(--on-surface-variant)]">
              Navigation bars, tab bars, floating action docks, sheets, popovers, toasts. Max 3 per screen.
            </p>
          </GlassCard>
        </div>
      </section>

      {/* 4. Segmented Control & Time Control Picker */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold font-heading">4. Segmented & Selectors</h2>
        <div className="space-y-4">
          <Segmented
            label="Game mode"
            value={segVal}
            onChange={setSegVal}
            options={[
              { value: "bullet", label: "Bullet", icon: <Zap size={14} /> },
              { value: "blitz", label: "Blitz", icon: <Swords size={14} /> },
              { value: "rapid", label: "Rapid", icon: <Trophy size={14} /> },
            ]}
          />

          <div>
            <h4 className="text-sm font-semibold text-[var(--on-surface-variant)] mb-2">Time Controls:</h4>
            <TimeControlPicker value={tcVal} onChange={setTcVal} />
          </div>
        </div>
      </section>

      {/* 5. Chips, Badges & Avatars */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold font-heading">5. Badges, Chips & Avatars</h2>
        <div className="flex flex-wrap items-center gap-4">
          <RatingBadge rating={1420} gamesPlayed={45} size="sm" />
          <RatingBadge rating={825} gamesPlayed={8} size="md" />
          <RatingBadge rating={2150} gamesPlayed={120} size="lg" />

          <Chip label="Beginner" selected />
          <Chip label="Casual" onClick={() => {}} />
          <Chip label="Master" icon={<Bot size={14} />} onClick={() => {}} />

          <Avatar name="Magnus Carlsen" size="sm" />
          <Avatar name="Hikaru Nakamura" size="md" />
          <Avatar name="Ismail Studio" size="lg" />
        </div>
      </section>

      {/* 6. Tabs, Inputs & Switches */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold font-heading">6. Form Controls</h2>
        <Tabs
          tabs={[
            { id: "all", label: "All Games", count: 42 },
            { id: "online", label: "Online", count: 28 },
            { id: "bots", label: "vs Bots", count: 14 },
          ]}
          activeTab={tab}
          onChange={setTab}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <Input
            label="Username"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            helperText="3 to 20 characters, lowercase letters and numbers"
          />
          <Input
            label="Invalid Input Example"
            defaultValue="ab"
            error="Username must be at least 3 characters"
          />
        </div>

        <div className="pt-2">
          <Switch
            checked={switchVal}
            onChange={setSwitchVal}
            label="Legal-move hints"
            description="Highlight valid destination squares when a piece is picked up"
          />
        </div>
      </section>

      {/* 7. Modal, BottomSheet & Toast triggers */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold font-heading">7. Overlays & Dialogs</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="tonal" onClick={() => setDialogOpen(true)}>
            Open Dialog Modal
          </Button>
          <Button variant="tonal" onClick={() => setSheetOpen(true)}>
            Open Bottom Sheet
          </Button>
          <Button variant="tonal" onClick={() => setToastVisible(true)}>
            Show Toast
          </Button>
        </div>

        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="Match Review Dialog"
        >
          <p className="text-sm text-[var(--on-surface-variant)] mb-4">
            Modal wrapped in functional Liquid Glass with focus trapping and backdrop dismissal.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outlined" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="filled" onClick={() => setDialogOpen(false)}>Confirm</Button>
          </div>
        </Dialog>

        <BottomSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Game Options"
        >
          <p className="text-sm text-[var(--on-surface-variant)] mb-4">
            Mobile-optimized glass bottom sheet with touch drag handle.
          </p>
          <Button variant="filled" className="w-full" onClick={() => setSheetOpen(false)}>
            Close Sheet
          </Button>
        </BottomSheet>

        <Toast
          visible={toastVisible}
          onClose={() => setToastVisible(false)}
          title="Challenge from Kasparov"
          description="Blitz 3+2 casual challenge"
          action={{
            label: "Accept",
            onClick: () => setToastVisible(false),
          }}
        />
      </section>

      {/* 8. Skeletons */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold font-heading">8. Loading Skeletons</h2>
        <div className="flex items-center gap-4">
          <Skeleton circle className="size-12" />
          <div className="space-y-2 flex-1 max-w-sm">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </section>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/components/i18n/provider";
import { fmtMoney } from "@/lib/i18n/format";
import {
  computeZakat, ZAKAT_ASNAAF, ZAKAT_NISAB_GOLD_GRAMS, ZAKAT_NISAB_SILVER_GRAMS,
  ZAKAT_RATE, ZAKAT_FITRA_PER_PERSON_MAD,
} from "@/lib/zakat";

// Public Zakat calculator. The bureau can embed this on /p/[slug] via
// a flag in DonationCampaign, or member can use it from /m/portal.
//
// The user enters their wealth; the page computes Nisab + Zakat in real
// time. The "Donate this amount" button hands off to the campaign
// donation flow (when wired).

export function ZakatCalculator({ campaignId }: { campaignId?: string }) {
  const { t, locale } = useT();
  const [cash, setCash] = useState("");
  const [savings, setSavings] = useState("");
  const [gold, setGold] = useState("");
  const [silver, setSilver] = useState("");
  const [investments, setInvestments] = useState("");
  const [receivables, setReceivables] = useState("");
  const [payables, setPayables] = useState("");
  const [goldRate, setGoldRate] = useState("650");  // ~650 MAD/g 2026 spot
  const [silverRate, setSilverRate] = useState("8"); // ~8 MAD/g 2026 spot

  const breakdown = useMemo(() => {
    const num = (s: string) => Number(s.replace(/\s+/g, "")) || 0;
    return computeZakat({
      cashOnHand: num(cash),
      savings: num(savings),
      goldGrams: num(gold),
      silverGrams: num(silver),
      investments: num(investments),
      receivables: num(receivables),
      payables: num(payables),
      goldMadPerGram: num(goldRate),
      silverMadPerGram: num(silverRate),
    });
  }, [cash, savings, gold, silver, investments, receivables, payables, goldRate, silverRate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🌙 {t("zakat.title")}
          <Badge variant="outline">{t("zakat.mal")}</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("zakat.subtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <NumberField id="cash" label={t("zakat.cash")} value={cash} onChange={setCash} />
          <NumberField id="savings" label={t("zakat.savings")} value={savings} onChange={setSavings} />
          <NumberField id="gold" label={t("zakat.goldGrams")} value={gold} onChange={setGold} />
          <NumberField id="silver" label={t("zakat.silverGrams")} value={silver} onChange={setSilver} />
          <NumberField id="inv" label={t("zakat.investments")} value={investments} onChange={setInvestments} />
          <NumberField id="recv" label={t("zakat.receivables")} value={receivables} onChange={setReceivables} />
          <NumberField id="pay" label={t("zakat.payables")} value={payables} onChange={setPayables} />
          <div className="grid grid-cols-2 gap-2 col-span-1 md:col-span-2">
            <NumberField id="goldRate" label={t("zakat.goldRate")} value={goldRate} onChange={setGoldRate} />
            <NumberField id="silverRate" label={t("zakat.silverRate")} value={silverRate} onChange={setSilverRate} />
          </div>
        </div>

        <div className="rounded-lg border bg-emerald-50/40 dark:bg-emerald-950/20 p-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span>{t("zakat.nisab")}</span>
            <span className="font-mono">{fmtMoney(breakdown.nisabMad, locale)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>{t("zakat.base")}</span>
            <span className="font-mono">{fmtMoney(breakdown.baseMad, locale)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>{t("zakat.zakatDue")} ({ZAKAT_RATE * 100}%)</span>
            <span className="text-emerald-700">{fmtMoney(breakdown.zakatMad, locale)}</span>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            {t("zakat.nisabExplainer", {
              goldGrams: ZAKAT_NISAB_GOLD_GRAMS,
              silverGrams: ZAKAT_NISAB_SILVER_GRAMS,
            })}
          </p>
        </div>

        <div className="rounded-lg border p-4 space-y-2">
          <p className="text-sm font-semibold">{t("zakat.fitraTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("zakat.fitraSubtitle")}</p>
          <div className="grid grid-cols-2 gap-2 items-end">
            <NumberField id="familySize" label={t("zakat.familySize")} value="" onChange={() => {}} placeholder="0" />
            <p className="text-sm text-muted-foreground">× {fmtMoney(ZAKAT_FITRA_PER_PERSON_MAD, locale)}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">{t("zakat.asnaafTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("zakat.asnaafSubtitle")}</p>
          <ul className="text-xs grid grid-cols-2 gap-1">
            {ZAKAT_ASNAAF.map((a) => (
              <li key={a} className="flex justify-between rounded bg-muted/40 px-2 py-1">
                <span>{t(`zakat.asnaaf.${a}`)}</span>
                <span className="font-mono text-emerald-700">{fmtMoney(breakdown.suggestedPerAsnaaf, locale)}</span>
              </li>
            ))}
          </ul>
        </div>

        {campaignId && breakdown.zakatMad > 0 && (
          <a
            href={`/p/${campaignId}?amount=${breakdown.zakatMad}&kind=ZAKAT_MAL`}
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
          >
            💚 {t("zakat.donateThisAmount")}
          </a>
        )}
      </CardContent>
    </Card>
  );
}

function NumberField({ id, label, value, onChange, placeholder }: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        value={value}
        placeholder={placeholder ?? "0"}
        onChange={(e) => onChange(e.target.value)}
        dir="ltr"
      />
    </div>
  );
}

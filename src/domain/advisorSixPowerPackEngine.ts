import {
  calculateCompliantQuote,
  calculateIrdSalariesTaxRelief,
  FX_RATES_FROM_USD,
} from './actuarialEngine';
import { getSpecialOfferForPlan } from './planLinksAndOffersEngine';
import {
  ClientLead,
  CurrencyCode,
  FxRateFeedState,
  HealthImpairmentCode,
  InsurancePlan,
  PlanCategory,
  PromoAdminOverride,
} from './types';

export type PowerPackToolId =
  | 'PRE_UW'
  | 'BACKDATE_RADAR'
  | 'DEDUCTIBLE_RELAY'
  | 'POLICY_SPLIT'
  | 'CLAIMS_CHECKLIST'
  | 'PAYMENT_PERKS';

// ============================================================================
// TOOL 1: 常見健康狀況「預先核保（Pre-underwriting）」速查表 ＋ 全產品庫智能配對
// ============================================================================

export type PreUwSeverityTier =
  | 'MILD_STABLE'
  | 'MODERATE_MONITORED'
  | 'UNINVESTIGATED_HIGH';

export type UwDecisionOutcome =
  | 'STANDARD'
  | 'LOADING'
  | 'EXCLUSION'
  | 'LOADING_OR_EXCLUSION'
  | 'POSTPONE_REPORT_FIRST'
  | 'GIO_NO_HEALTH_QUESTIONS';

export interface ConditionPreUwProfile {
  code: HealthImpairmentCode;
  labelZh: string;
  labelEn: string;
  shortTagZh: string;
  severityLabelsZh: Record<PreUwSeverityTier, string>;
  severityLabelsEn: Record<PreUwSeverityTier, string>;
  requiredReportsZh: string[];
  requiredReportsEn: string[];
  advisorCoachingTipZh: string;
  advisorCoachingTipEn: string;
  outcomesBySeverity: Record<
    PreUwSeverityTier,
    {
      medicalVhis: { outcome: UwDecisionOutcome; noteZh: string; noteEn: string; loadingPct: number };
      criticalIllness: { outcome: UwDecisionOutcome; noteZh: string; noteEn: string; loadingPct: number };
      lifeTermUl: { outcome: UwDecisionOutcome; noteZh: string; noteEn: string; loadingPct: number };
      savingsQdap: { outcome: UwDecisionOutcome; noteZh: string; noteEn: string; loadingPct: number };
    }
  >;
}

export const PRE_UW_CONDITION_PROFILES: ConditionPreUwProfile[] = [
  {
    code: 'THYROID_NODULE',
    labelZh: '甲狀腺結節（TI-RADS 分級）',
    labelEn: 'Thyroid Nodule (TI-RADS 1–4)',
    shortTagZh: '甲狀腺結節',
    severityLabelsZh: {
      MILD_STABLE: 'TI-RADS 1–2 良性水囊／< 1cm 且 1 年以上無增大（甲功正常）',
      MODERATE_MONITORED: 'TI-RADS 3 或 1–1.5cm 實性結節（已抽針良性／定期超聲波跟進）',
      UNINVESTIGATED_HIGH: 'TI-RADS 4+ 或 > 1.5cm 新發現結節（尚未完成幼針抽組織 FNA）',
    },
    severityLabelsEn: {
      MILD_STABLE: 'TI-RADS 1–2 benign cyst <1cm, stable >12m, normal TSH/FT4',
      MODERATE_MONITORED: 'TI-RADS 3 or 1–1.5cm solid nodule with benign FNA / regular USG',
      UNINVESTIGATED_HIGH: 'TI-RADS 4+ or >1.5cm newly detected without FNA biopsy yet',
    },
    requiredReportsZh: [
      '近 6–12 個月內私家／醫管局「甲狀腺超聲波報告」（必須列明結節大細 mm 及 TI-RADS 分級）',
      '最新血液甲狀腺功能報告（TSH、Free T3、Free T4）',
      '如曾做幼針抽組織（FNA Biopsy）或手術切除，附上組織病理學良性報告（Pathology Report）',
    ],
    requiredReportsEn: [
      'Thyroid Ultrasound report within 6–12 months showing exact size (mm) & TI-RADS grade',
      'Latest thyroid function blood panel (TSH, Free T3, Free T4)',
      'Fine-Needle Aspiration (FNA) cytology or post-op pathology report if performed',
    ],
    advisorCoachingTipZh:
      '切勿只憑客戶口述「醫生話無事」直接遞單！先收齊超聲波報告確認 TI-RADS 級別，甲狀腺除外（Exclusion）總比未查清被延期（Postpone）留紀錄理想。',
    advisorCoachingTipEn:
      'Always collect the exact TI-RADS ultrasound report before formal submission to avoid unnecessary postponement records.',
    outcomesBySeverity: {
      MILD_STABLE: {
        medicalVhis: {
          outcome: 'EXCLUSION',
          noteZh: '多數批「甲狀腺除外」或良性水囊已穩定 >2 年有機會爭取標準受保',
          noteEn: 'Usually Thyroid Exclusion; pure cyst stable >2y may achieve Standard',
          loadingPct: 0,
        },
        criticalIllness: {
          outcome: 'STANDARD',
          noteZh: 'TI-RADS 1–2 小水囊且甲功正常，主流保司多可標準受保或僅甲狀腺癌除外',
          noteEn: 'Standard or thyroid carcinoma exclusion depending on insurer',
          loadingPct: 0,
        },
        lifeTermUl: {
          outcome: 'STANDARD',
          noteZh: '純人壽死亡風險極低，一般可獲標準保費批核（Standard）',
          noteEn: 'Standard acceptance across major HK life insurers',
          loadingPct: 0,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '免驗身簡易核保（GIO）額度內零加價、零除外直接批核',
          noteEn: 'Guaranteed/simplified issue within GIO limit — 100% Standard',
          loadingPct: 0,
        },
      },
      MODERATE_MONITORED: {
        medicalVhis: {
          outcome: 'EXCLUSION',
          noteZh: '私家醫保／VHIS 通常設「甲狀腺及相關疾病不保事項」，其餘全身保障100%有效',
          noteEn: 'Thyroid & related conditions excluded; full coverage on all other organs',
          loadingPct: 0,
        },
        criticalIllness: {
          outcome: 'EXCLUSION',
          noteZh: '已抽針良性一般批「甲狀腺癌／原位癌除外」，其他 100+ 種危疾正常受保',
          noteEn: 'Thyroid cancer excluded after benign FNA; all other CI conditions covered',
          loadingPct: 0,
        },
        lifeTermUl: {
          outcome: 'STANDARD',
          noteZh: '若有良性 FNA 報告，人壽一般標準受保或輕微加費 +20%',
          noteEn: 'Standard or mild +20% loading with benign FNA',
          loadingPct: 0,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '儲蓄分紅及扣稅年金免驗身直通批核',
          noteEn: 'Direct standard approval under GIO savings rules',
          loadingPct: 0,
        },
      },
      UNINVESTIGATED_HIGH: {
        medicalVhis: {
          outcome: 'POSTPONE_REPORT_FIRST',
          noteZh: '建議先完成 FNA 抽針確認良性再遞交醫保，否則核保部極大機會延期（Postpone）',
          noteEn: 'Complete FNA biopsy before applying; otherwise likely Postponed',
          loadingPct: 0,
        },
        criticalIllness: {
          outcome: 'POSTPONE_REPORT_FIRST',
          noteZh: 'TI-RADS 4 未抽針一般會延期審批；可先配置免核保儲蓄或完成抽針後投保',
          noteEn: 'Likely postponed pending FNA cytology clearance',
          loadingPct: 0,
        },
        lifeTermUl: {
          outcome: 'POSTPONE_REPORT_FIRST',
          noteZh: '需待病理報告排除惡性腫瘤後方可批核',
          noteEn: 'Deferred until biopsy rules out malignancy',
          loadingPct: 0,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '免健康問題之多元貨幣儲蓄及 QDAP 年金不受結節影響，可即時鎖定回報',
          noteEn: 'GIO Participating Savings & QDAP remain eligible immediately',
          loadingPct: 0,
        },
      },
    },
  },
  {
    code: 'FATTY_LIVER',
    labelZh: '脂肪肝／肝酵素（ALT/AST）偏高',
    labelEn: 'Fatty Liver / Elevated Liver Enzymes',
    shortTagZh: '脂肪肝',
    severityLabelsZh: {
      MILD_STABLE: '輕度脂肪肝 · 肝酵素 ALT/AST/GGT 完全正常、無乙肝、BMI < 27',
      MODERATE_MONITORED: '中度脂肪肝 · 肝酵素輕微超標（< 1.5 倍上限）或伴隨輕微肥胖',
      UNINVESTIGATED_HIGH: '重度脂肪肝／肝纖維化傾向 或 肝酵素 > 2–3 倍上限未覆檢',
    },
    severityLabelsEn: {
      MILD_STABLE: 'Mild fatty liver, normal ALT/AST/GGT, HBsAg negative, BMI <27',
      MODERATE_MONITORED: 'Moderate fatty liver, ALT/AST <1.5x ULN or elevated BMI',
      UNINVESTIGATED_HIGH: 'Severe fatty liver / fibrosis or ALT >2–3x ULN uninvestigated',
    },
    requiredReportsZh: [
      '近 6 個月內腹部超聲波報告（Abdominal Ultrasound）或 FibroScan 肝纖維化掃描',
      '最新肝功能全套驗血（ALT、AST、GGT、ALP、Bilirubin、Albumin）',
      '乙型／丙型肝炎表面抗原檢測（HBsAg / Anti-HCV）及空腹血糖、血脂報告',
    ],
    requiredReportsEn: [
      'Abdominal Ultrasound or FibroScan within 6 months',
      'Full Liver Function Test (ALT, AST, GGT, Bilirubin) + HBsAg',
      'Fasting glucose, HbA1c & lipid panel + current height/weight BMI',
    ],
    advisorCoachingTipZh:
      '香港都市人極常見！若客戶上月飲酒／捱夜導致 ALT 短暫微升，建議戒酒清淡飲食 4 週後去私家化驗所重驗肝功能正常再遞單，往往可由加價變「標準受保」！',
    advisorCoachingTipEn:
      'If ALT was transiently elevated after alcohol or late nights, re-testing after 4 weeks of lifestyle cleanup often turns a +25% loading into Standard!',
    outcomesBySeverity: {
      MILD_STABLE: {
        medicalVhis: {
          outcome: 'STANDARD',
          noteZh: '肝酵素正常且無三高／肝炎，主流 VHIS 及高端醫保大機會「標準受保」',
          noteEn: 'Frequently accepted at Standard rates when LFTs & BMI are normal',
          loadingPct: 0,
        },
        criticalIllness: {
          outcome: 'STANDARD',
          noteZh: '輕度單純性脂肪肝連正常肝功能，危疾保單一般可獲標準批核',
          noteEn: 'Standard acceptance with normal LFTs and negative hepatitis',
          loadingPct: 0,
        },
        lifeTermUl: {
          outcome: 'STANDARD',
          noteZh: '人壽標準受保（Standard）',
          noteEn: 'Standard rate',
          loadingPct: 0,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '免驗身標準批核',
          noteEn: 'GIO Standard acceptance',
          loadingPct: 0,
        },
      },
      MODERATE_MONITORED: {
        medicalVhis: {
          outcome: 'LOADING',
          noteZh: '視乎 BMI 及血脂，一般加保費（Loading）約 +20% 至 +35%（不設除外更佳）',
          noteEn: 'Typically +20% to +35% premium loading while keeping full liver cover',
          loadingPct: 25,
        },
        criticalIllness: {
          outcome: 'LOADING',
          noteZh: '危疾常見加費 +25% 至 +50%，全身包括肝癌及心血管均受保',
          noteEn: 'Typically +25% to +50% loading with full organ coverage retained',
          loadingPct: 30,
        },
        lifeTermUl: {
          outcome: 'LOADING',
          noteZh: '標準或輕微加費 +20%~+25%',
          noteEn: 'Standard to +25% loading',
          loadingPct: 20,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '儲蓄分紅及扣稅年金免驗身零加價批核',
          noteEn: 'Zero loading under GIO savings underwriting',
          loadingPct: 0,
        },
      },
      UNINVESTIGATED_HIGH: {
        medicalVhis: {
          outcome: 'POSTPONE_REPORT_FIRST',
          noteZh: 'ALT > 2–3 倍需先覆檢排除急性肝炎／硬化；或先選簡化核保三高／癌症專項計劃',
          noteEn: 'Repeat LFT + FibroScan needed; consider simplified-issue plans first',
          loadingPct: 50,
        },
        criticalIllness: {
          outcome: 'POSTPONE_REPORT_FIRST',
          noteZh: '傳統危疾多會延期 3–6 個月待肝酵素回落；可先投保簡化核保危疾或儲蓄',
          noteEn: 'Deferred 3–6m pending LFT normalization; simplified CI available',
          loadingPct: 50,
        },
        lifeTermUl: {
          outcome: 'LOADING',
          noteZh: '重度加費或延期待覆檢',
          noteEn: 'Heavy loading or postpone pending repeat LFT',
          loadingPct: 50,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '免健康核保多元貨幣儲蓄及香港年金／QDAP 可即時投保',
          noteEn: 'GIO Savings & QDAP accepted without medical questions',
          loadingPct: 0,
        },
      },
    },
  },
  {
    code: 'HYPERTENSION_CONTROLLED',
    labelZh: '血壓偏高／正服食降血壓藥',
    labelEn: 'Hypertension / Blood Pressure Medication',
    shortTagZh: '血壓偏高',
    severityLabelsZh: {
      MILD_STABLE: '單一降壓藥控制理想（日常血壓 < 135/85 mmHg）且心電圖／腎功能正常',
      MODERATE_MONITORED: '服食 2 種降壓藥或血壓介乎 140–150 / 90–95 mmHg（無器官併發症）',
      UNINVESTIGATED_HIGH: '血壓 > 160/100 mmHg 未求醫服藥，或合併蛋白尿／左心室肥厚',
    },
    severityLabelsEn: {
      MILD_STABLE: 'Well controlled <135/85 mmHg on single medication, normal ECG & renal panel',
      MODERATE_MONITORED: 'Dual medication or BP 140–150/90–95 mmHg without target-organ damage',
      UNINVESTIGATED_HIGH: 'Uncontrolled >160/100 mmHg or proteinuria / LVH complications',
    },
    requiredReportsZh: [
      '最近 6–12 個月覆診處方藥單（列明藥名、劑量及開始服藥年份）及家居血壓紀錄',
      '空腹驗血及尿液常規（腎功能 Creatinine/eGFR、血脂、血糖、尿蛋白 Urine Dipstick）',
      '靜態心電圖（Resting ECG）報告（45 歲以上或投保高保額必備）',
    ],
    requiredReportsEn: [
      'Medication prescription list (drug name, dosage, duration) & home BP log',
      'Renal panel (Creatinine/eGFR), fasting lipids/glucose & urinalysis for proteinuria',
      'Resting ECG report',
    ],
    advisorCoachingTipZh:
      '千萬別叫客戶「停藥一星期去驗身」！有醫生處方穩定控制 <135/85 反而比「高血壓唔食藥」更容易批出輕微 Loading 甚至標準體，亦可同步配搭三高簡化核保醫保。',
    advisorCoachingTipEn:
      'Consistent medication compliance (<135/85) receives far more favorable underwriting than untreated borderline hypertension.',
    outcomesBySeverity: {
      MILD_STABLE: {
        medicalVhis: {
          outcome: 'LOADING',
          noteZh: '控制極佳有機會標準或輕微加費 +20%~+25%（連心腦血管全數受保）',
          noteEn: 'Standard or +20–25% loading with full cardiovascular inpatient cover',
          loadingPct: 20,
        },
        criticalIllness: {
          outcome: 'LOADING',
          noteZh: '一般加費 +20% 至 +35%，心臟病及中風仍然納入保障',
          noteEn: '+20% to +35% loading; stroke & heart attack remain covered',
          loadingPct: 25,
        },
        lifeTermUl: {
          outcome: 'STANDARD',
          noteZh: '單一藥物控制良好，人壽多可標準或 +15%~+25% 批核',
          noteEn: 'Often Standard or +15–25% loading',
          loadingPct: 15,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '免驗身標準受保，無任何加費',
          noteEn: 'GIO Standard — zero loading',
          loadingPct: 0,
        },
      },
      MODERATE_MONITORED: {
        medicalVhis: {
          outcome: 'LOADING',
          noteZh: '一般加費 +35% 至 +50%，或改選「三高簡化核保醫療／專項抗癌醫保」',
          noteEn: '+35–50% loading, or pair with 3-Highs simplified medical / cancer medical plan',
          loadingPct: 40,
        },
        criticalIllness: {
          outcome: 'LOADING',
          noteZh: '加費 +50% 左右，或改配「純癌症保障（不問血壓）」鎖定平保費',
          noteEn: '~+50% loading, or pivot to pure Cancer CI plan unaffected by BP',
          loadingPct: 45,
        },
        lifeTermUl: {
          outcome: 'LOADING',
          noteZh: '加費 +25% 至 +50%',
          noteEn: '+25% to +50% loading',
          loadingPct: 35,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '儲蓄分紅及扣稅年金 100% 免驗身標準批核',
          noteEn: '100% GIO Standard acceptance',
          loadingPct: 0,
        },
      },
      UNINVESTIGATED_HIGH: {
        medicalVhis: {
          outcome: 'POSTPONE_REPORT_FIRST',
          noteZh: '未受控高血壓傳統醫保會延期；建議先由醫生處方穩定血壓 3 個月，或投保純癌症保',
          noteEn: 'Postponed until BP controlled for 3+ months; pure cancer cover available',
          loadingPct: 60,
        },
        criticalIllness: {
          outcome: 'POSTPONE_REPORT_FIRST',
          noteZh: '傳統危疾延期／拒保；可改選專項抗癌保或免驗身儲蓄傳承方案',
          noteEn: 'Standard CI declined/postponed; pivot to Cancer-only or GIO Savings',
          loadingPct: 60,
        },
        lifeTermUl: {
          outcome: 'POSTPONE_REPORT_FIRST',
          noteZh: '需先穩定血壓及排除腎／心臟併發症',
          noteEn: 'Stabilize BP first',
          loadingPct: 60,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '免健康核保儲蓄分紅及香港年金／QDAP 照常批核',
          noteEn: 'GIO Savings & Annuity approved without health underwriting',
          loadingPct: 0,
        },
      },
    },
  },
  {
    code: 'HYPERLIPIDEMIA',
    labelZh: '膽固醇／三酸甘油酯偏高',
    labelEn: 'High Cholesterol / Hyperlipidemia',
    shortTagZh: '膽固醇偏高',
    severityLabelsZh: {
      MILD_STABLE: '總膽固醇 < 6.2 mmol/L 或服食他汀類藥物（Statin）後指標完全達標',
      MODERATE_MONITORED: '總膽固醇 6.3–7.2 mmol/L 或 LDL 偏高（無高血壓／糖尿病／肥胖疊加）',
      UNINVESTIGATED_HIGH: '總膽固醇 > 7.5 mmol/L 或三酸甘油酯 > 4.5 mmol/L 合併代謝綜合症',
    },
    severityLabelsEn: {
      MILD_STABLE: 'Total Cholesterol <6.2 mmol/L or normalized on Statin therapy',
      MODERATE_MONITORED: 'Total Cholesterol 6.3–7.2 mmol/L without diabetes/hypertension',
      UNINVESTIGATED_HIGH: 'Total Cholesterol >7.5 or Triglycerides >4.5 with metabolic risks',
    },
    requiredReportsZh: [
      '近 6 個月空腹血脂全套報告（Total Cholesterol、HDL 好膽固醇、LDL 壞膽固醇、Triglycerides）',
      '空腹血糖／HbA1c 及血壓紀錄（核保員主要計算心血管綜合風險比率 TC/HDL Ratio）',
      '如有服食降膽固醇藥（如 Rosuvastatin / Atorvastatin），附上最新覆診藥單',
    ],
    requiredReportsEn: [
      'Fasting lipid profile within 6 months (TC, HDL, LDL, Triglycerides & TC/HDL ratio)',
      'Fasting glucose / HbA1c & blood pressure reading',
      'Statin prescription record if on lipid-lowering medication',
    ],
    advisorCoachingTipZh:
      '香港核保極重視「TC / HDL 比例」！如果客戶總膽固醇微高（如 6.0），但經常運動令好膽固醇 HDL 高（TC/HDL < 4.5），絕大多數保司可直接批「標準受保」！',
    advisorCoachingTipEn:
      'HK underwriters focus heavily on the TC/HDL ratio: when HDL is strong (TC/HDL <4.5), mild total cholesterol elevation is routinely accepted at Standard rates.',
    outcomesBySeverity: {
      MILD_STABLE: {
        medicalVhis: {
          outcome: 'STANDARD',
          noteZh: 'TC/HDL 比例理想或服藥達標，VHIS 及高端醫療普遍「標準受保」',
          noteEn: 'Standard acceptance across VHIS & High-End Medical',
          loadingPct: 0,
        },
        criticalIllness: {
          outcome: 'STANDARD',
          noteZh: '無吸煙及血壓血糖正常者，多數可獲標準保費批核',
          noteEn: 'Standard rates for non-smokers with normal BP & glucose',
          loadingPct: 0,
        },
        lifeTermUl: {
          outcome: 'STANDARD',
          noteZh: '標準受保（Standard）',
          noteEn: 'Standard rate',
          loadingPct: 0,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '免驗身標準批核',
          noteEn: 'GIO Standard',
          loadingPct: 0,
        },
      },
      MODERATE_MONITORED: {
        medicalVhis: {
          outcome: 'LOADING',
          noteZh: '標準或輕微加費 +15% 至 +25%',
          noteEn: 'Standard to +15–25% loading',
          loadingPct: 20,
        },
        criticalIllness: {
          outcome: 'LOADING',
          noteZh: '加費約 +20% 至 +30%（保留心臟病及中風保障）',
          noteEn: '+20–30% loading with full cardiac/stroke cover',
          loadingPct: 25,
        },
        lifeTermUl: {
          outcome: 'STANDARD',
          noteZh: '標準或 +15% 輕微加費',
          noteEn: 'Standard or +15% loading',
          loadingPct: 15,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '免驗身零加價',
          noteEn: 'GIO Standard',
          loadingPct: 0,
        },
      },
      UNINVESTIGATED_HIGH: {
        medicalVhis: {
          outcome: 'LOADING',
          noteZh: '重度加費 +40%~+50% 或建議飲食／藥物控制 3 個月重驗後投保',
          noteEn: '+40–50% loading or re-test after 3 months of treatment',
          loadingPct: 45,
        },
        criticalIllness: {
          outcome: 'POSTPONE_REPORT_FIRST',
          noteZh: '合併三高者建議先服藥穩定血脂 3 個月，或先買專項抗癌＋免驗身儲蓄',
          noteEn: 'Stabilize lipids for 3m first, or pair Cancer-only + GIO Savings',
          loadingPct: 50,
        },
        lifeTermUl: {
          outcome: 'LOADING',
          noteZh: '加費 +35%~+50%',
          noteEn: '+35–50% loading',
          loadingPct: 40,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '免驗身儲蓄分紅及扣稅年金不受影響',
          noteEn: 'GIO Savings & QDAP unaffected',
          loadingPct: 0,
        },
      },
    },
  },
  {
    code: 'COLON_POLYP',
    labelZh: '大腸息肉（腸鏡切除後）',
    labelEn: 'Colonic Polyp (Post-Colonoscopy)',
    shortTagZh: '大腸息肉',
    severityLabelsZh: {
      MILD_STABLE: '增生性息肉（Hyperplastic）或單粒良性管狀腺瘤 <1cm 已完全切除（病理良性）',
      MODERATE_MONITORED: '多發性腺瘤（2–4 粒）或絨毛狀腺瘤（Tubulovillous）已切除且無異型增生',
      UNINVESTIGATED_HIGH: '大便隱血陽性尚未照腸鏡，或病理顯示高度異型增生（High-grade Dysplasia）',
    },
    severityLabelsEn: {
      MILD_STABLE: 'Hyperplastic or single benign tubular adenoma <1cm completely excised',
      MODERATE_MONITORED: 'Multiple (2–4) or tubulovillous adenomas excised, no high-grade dysplasia',
      UNINVESTIGATED_HIGH: 'Positive occult blood pending colonoscopy, or high-grade dysplasia',
    },
    requiredReportsZh: [
      '大腸鏡檢查報告（Colonoscopy Report — 列明息肉數目、位置及是否已完全切除 Complete Polypectomy）',
      '組織病理化驗報告（Histopathology Report — 最關鍵！必須證明 Benign 良性及無惡性細胞）',
    ],
    requiredReportsEn: [
      'Colonoscopy report confirming polyp count, size & complete polypectomy',
      'Histopathology report confirming benign nature & absence of malignancy',
    ],
    advisorCoachingTipZh:
      '「大腸鏡報告 ＋ 病理化驗報告」兩份缺一不可！只要完整切除且病理屬良性增生性／低度管狀腺瘤，好多保司連除外都唔使，直接批「標準受保」！',
    advisorCoachingTipEn:
      'Submitting both the Colonoscopy Report AND Benign Pathology Report together frequently secures 100% Standard acceptance!',
    outcomesBySeverity: {
      MILD_STABLE: {
        medicalVhis: {
          outcome: 'STANDARD',
          noteZh: '已完全切除滿 3–6 個月並附良性病理報告，大機會「標準受保」或僅短期大腸息肉觀察',
          noteEn: 'Often Standard once complete excision & benign pathology are submitted',
          loadingPct: 0,
        },
        criticalIllness: {
          outcome: 'STANDARD',
          noteZh: '良性息肉切除後反而降低腸癌風險，危疾及人壽普遍「標準受保」',
          noteEn: 'Standard acceptance across major CI & Life plans',
          loadingPct: 0,
        },
        lifeTermUl: {
          outcome: 'STANDARD',
          noteZh: '標準受保（Standard）',
          noteEn: 'Standard rate',
          loadingPct: 0,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '免驗身標準批核',
          noteEn: 'GIO Standard',
          loadingPct: 0,
        },
      },
      MODERATE_MONITORED: {
        medicalVhis: {
          outcome: 'EXCLUSION',
          noteZh: '部分保司設「結直腸息肉／良性病變除外（1–2 年後覆檢可申請撤銷）」或輕微加費',
          noteEn: 'Colorectal polyp exclusion (reviewable after clean follow-up scope) or mild loading',
          loadingPct: 0,
        },
        criticalIllness: {
          outcome: 'STANDARD',
          noteZh: '無高度異型增生者，危疾一般標準或 +20% 加費',
          noteEn: 'Standard or +20% loading without high-grade dysplasia',
          loadingPct: 15,
        },
        lifeTermUl: {
          outcome: 'STANDARD',
          noteZh: '標準受保',
          noteEn: 'Standard rate',
          loadingPct: 0,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '免驗身標準批核',
          noteEn: 'GIO Standard',
          loadingPct: 0,
        },
      },
      UNINVESTIGATED_HIGH: {
        medicalVhis: {
          outcome: 'POSTPONE_REPORT_FIRST',
          noteZh: '大便隱血陽性必須先完成腸鏡取得病理報告方可核保；高度異型增生需觀察期',
          noteEn: 'Postponed until colonoscopy & pathology report are completed',
          loadingPct: 0,
        },
        criticalIllness: {
          outcome: 'POSTPONE_REPORT_FIRST',
          noteZh: '延期至腸鏡及覆診病理確認無癌變',
          noteEn: 'Deferred pending colonoscopy clearance',
          loadingPct: 0,
        },
        lifeTermUl: {
          outcome: 'POSTPONE_REPORT_FIRST',
          noteZh: '需先完成腸鏡檢查',
          noteEn: 'Pending colonoscopy',
          loadingPct: 0,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '免健康核保多元貨幣儲蓄及扣稅年金可即時投保',
          noteEn: 'GIO Savings & QDAP remain open for immediate enrollment',
          loadingPct: 0,
        },
      },
    },
  },
  {
    code: 'BREAST_CYST_BENIGN',
    labelZh: '乳腺結節／纖維瘤（BI-RADS 分級）',
    labelEn: 'Breast Cyst / Fibroadenoma (BI-RADS)',
    shortTagZh: '乳腺結節',
    severityLabelsZh: {
      MILD_STABLE: 'BI-RADS 1–2 單純乳腺水囊或已手術切除良性纖維瘤滿 6 個月',
      MODERATE_MONITORED: 'BI-RADS 3 良性可能結節（定期每 6–12 個月乳房超聲波穩定無變大）',
      UNINVESTIGATED_HIGH: 'BI-RADS 4+ 或新摸到硬塊尚未做乳房超聲波／抽針（Core Biopsy）',
    },
    severityLabelsEn: {
      MILD_STABLE: 'BI-RADS 1–2 simple cyst or excised benign fibroadenoma >6m ago',
      MODERATE_MONITORED: 'BI-RADS 3 probably benign nodule stable on serial ultrasound',
      UNINVESTIGATED_HIGH: 'BI-RADS 4+ or uninvestigated breast lump pending biopsy',
    },
    requiredReportsZh: [
      '近 6–12 個月乳房超聲波（Breast Ultrasound）及／或 3D 乳房造影（Mammogram）報告（列明 BI-RADS 分級）',
      '如曾做粗針抽組織（Core Biopsy）或微創切除（Mammotome），附上良性病理報告',
    ],
    requiredReportsEn: [
      'Breast Ultrasound / Mammogram within 6–12 months clearly stating BI-RADS category',
      'Biopsy or excision histopathology report if performed',
    ],
    advisorCoachingTipZh:
      '女士投保最常遇到！BI-RADS 2 水囊若報告寫明 Simple Cyst，部分核保寬鬆保司連乳房除外都可豁免；BI-RADS 3 則普遍批乳房除外，建議保留日後覆檢正常申請撤銷除外（Review Exclusion）權利。',
    advisorCoachingTipEn:
      'BI-RADS 2 simple cysts often qualify for Standard CI; BI-RADS 3 typically carries a reviewable breast exclusion on medical plans.',
    outcomesBySeverity: {
      MILD_STABLE: {
        medicalVhis: {
          outcome: 'STANDARD',
          noteZh: '已切除良性纖維瘤或單純小水囊有機會「標準受保」，或僅良性乳房病變除外',
          noteEn: 'Standard after benign excision, or benign breast cyst exclusion only',
          loadingPct: 0,
        },
        criticalIllness: {
          outcome: 'STANDARD',
          noteZh: 'BI-RADS 1–2 多數保司危疾（包括乳癌保障）可獲「標準受保」！',
          noteEn: 'Standard acceptance including breast cancer cover for BI-RADS 1–2',
          loadingPct: 0,
        },
        lifeTermUl: {
          outcome: 'STANDARD',
          noteZh: '標準受保（Standard）',
          noteEn: 'Standard rate',
          loadingPct: 0,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '免驗身標準批核',
          noteEn: 'GIO Standard',
          loadingPct: 0,
        },
      },
      MODERATE_MONITORED: {
        medicalVhis: {
          outcome: 'EXCLUSION',
          noteZh: 'VHIS／私家醫保一般設「乳房及相關疾病不保事項」，其他全身醫療100%受保',
          noteEn: 'Breast condition exclusion; all other hospital & surgical cover intact',
          loadingPct: 0,
        },
        criticalIllness: {
          outcome: 'EXCLUSION',
          noteZh: '通常設「乳房原位癌／乳癌除外」（如有良性抽針報告可向個別保司爭取只除外原位癌）',
          noteEn: 'Breast carcinoma exclusion (negotiable if benign biopsy provided)',
          loadingPct: 0,
        },
        lifeTermUl: {
          outcome: 'STANDARD',
          noteZh: '純人壽一般可獲標準受保',
          noteEn: 'Standard acceptance on pure Life',
          loadingPct: 0,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '免驗身標準批核',
          noteEn: 'GIO Standard',
          loadingPct: 0,
        },
      },
      UNINVESTIGATED_HIGH: {
        medicalVhis: {
          outcome: 'POSTPONE_REPORT_FIRST',
          noteZh: 'BI-RADS 4 必須先完成抽針排除惡性後再遞單',
          noteEn: 'Complete breast biopsy clearance before submitting medical/CI',
          loadingPct: 0,
        },
        criticalIllness: {
          outcome: 'POSTPONE_REPORT_FIRST',
          noteZh: '待病理報告出爐後審核；期間可先配置免驗身儲蓄傳承計劃',
          noteEn: 'Postponed pending biopsy; GIO Savings immediately available',
          loadingPct: 0,
        },
        lifeTermUl: {
          outcome: 'POSTPONE_REPORT_FIRST',
          noteZh: '待病理報告排除惡性',
          noteEn: 'Pending biopsy result',
          loadingPct: 0,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '免健康核保儲蓄分紅及扣稅年金可即時批核',
          noteEn: 'GIO Savings & QDAP accepted immediately',
          loadingPct: 0,
        },
      },
    },
  },
  {
    code: 'HEP_B_CARRIER',
    labelZh: '乙型肝炎帶菌者（HBsAg+）',
    labelEn: 'Hepatitis B Carrier (HBsAg Positive)',
    shortTagZh: '乙肝帶菌',
    severityLabelsZh: {
      MILD_STABLE: '非活躍帶菌（HBeAg 陰性 · ALT/AST 肝酵素正常 · 甲胎蛋白 AFP 及肝超聲波正常）',
      MODERATE_MONITORED: '正服食抗病毒藥（如 Entecavir）控制穩定 或 病毒載量偏高但無肝硬化',
      UNINVESTIGATED_HIGH: '肝酵素持續超標、合併脂肪肝／纖維化 或 長年無做肝臟超聲波檢查',
    },
    severityLabelsEn: {
      MILD_STABLE: 'Inactive carrier (HBeAg-, normal ALT/AST, normal AFP & liver ultrasound)',
      MODERATE_MONITORED: 'Stable on antiviral therapy (e.g. Entecavir) without cirrhosis',
      UNINVESTIGATED_HIGH: 'Elevated ALT, fibrosis/cirrhosis signs or no recent liver imaging',
    },
    requiredReportsZh: [
      '近 6 個月肝功能報告（ALT、AST、GGT、Bilirubin）及甲胎蛋白（AFP 肝癌指標）',
      '乙肝五項／e抗原（HBeAg）及乙肝病毒載量（HBV DNA 定量）',
      '近 6–12 個月肝膽腹部超聲波報告（確認無肝硬化或局灶性結節）',
    ],
    requiredReportsEn: [
      'Liver function panel (ALT, AST, GGT) + Alpha-Fetoprotein (AFP) within 6 months',
      'HBeAg status & HBV DNA viral load test',
      'Liver Ultrasound within 6–12 months ruling out cirrhosis/lesions',
    ],
    advisorCoachingTipZh:
      '香港 35 歲以上客戶十分常見！帶齊正常肝超聲波＋正常 ALT＋HBeAg 陰性報告，大部分主流保司都接受「加費承保（不除外肝臟）」或「肝臟除外」，顧問可同時報 2 間保司擇優批核（Simultaneous Pre-UW）！',
    advisorCoachingTipEn:
      'With normal ultrasound, normal ALT & negative HBeAg, major HK insurers routinely offer moderate loading while keeping full liver cancer coverage!',
    outcomesBySeverity: {
      MILD_STABLE: {
        medicalVhis: {
          outcome: 'LOADING_OR_EXCLUSION',
          noteZh: '一般加費 +25% 至 +50%（全包肝臟）或批「乙肝及其併發症除外」',
          noteEn: '+25–50% loading (full cover) or Hepatitis B & liver complication exclusion',
          loadingPct: 30,
        },
        criticalIllness: {
          outcome: 'LOADING',
          noteZh: '主流保司多批加費 +25% 至 +50% 並保留肝癌保障（極具投保價值！）',
          noteEn: '+25–50% loading while retaining full liver cancer lump-sum cover',
          loadingPct: 35,
        },
        lifeTermUl: {
          outcome: 'LOADING',
          noteZh: '輕微加費 +20% 至 +35%',
          noteEn: '+20–35% loading',
          loadingPct: 25,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '免驗身儲蓄分紅及扣稅年金 100% 標準零加價',
          noteEn: '100% GIO Standard zero loading',
          loadingPct: 0,
        },
      },
      MODERATE_MONITORED: {
        medicalVhis: {
          outcome: 'EXCLUSION',
          noteZh: '多批「肝臟疾病除外」或較高加費；其他癌症、心腦血管及意外100%受保',
          noteEn: 'Liver exclusion on medical; all non-hepatic conditions covered in full',
          loadingPct: 50,
        },
        criticalIllness: {
          outcome: 'LOADING_OR_EXCLUSION',
          noteZh: '加費 +50%~+75% 或肝臟除外，視乎各保司再保指引',
          noteEn: '+50–75% loading or liver exclusion depending on reinsurer manual',
          loadingPct: 55,
        },
        lifeTermUl: {
          outcome: 'LOADING',
          noteZh: '加費 +50% 左右',
          noteEn: '~+50% loading',
          loadingPct: 50,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '免驗身儲蓄及年金照常標準批核',
          noteEn: 'GIO Savings & Annuity approved at Standard',
          loadingPct: 0,
        },
      },
      UNINVESTIGATED_HIGH: {
        medicalVhis: {
          outcome: 'POSTPONE_REPORT_FIRST',
          noteZh: '必須先補做肝超聲波及肝功能驗血，排除活躍肝炎／硬化後方可審批',
          noteEn: 'Complete liver ultrasound & LFT panel first before submitting',
          loadingPct: 0,
        },
        criticalIllness: {
          outcome: 'POSTPONE_REPORT_FIRST',
          noteZh: '未有近期超聲波會直接出驗身照會（ME）或延期；建議先私家驗妥再交',
          noteEn: 'Prepare private liver USG & AFP first to avoid blind postponement',
          loadingPct: 0,
        },
        lifeTermUl: {
          outcome: 'POSTPONE_REPORT_FIRST',
          noteZh: '需補肝功能及超聲波報告',
          noteEn: 'Requires LFT & USG',
          loadingPct: 0,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '免健康核保儲蓄分紅及扣稅年金可即時投保',
          noteEn: 'GIO Savings & QDAP eligible immediately',
          loadingPct: 0,
        },
      },
    },
  },
  {
    code: 'PREDIABETES',
    labelZh: '血糖偏高／糖尿病前期（HbA1c）',
    labelEn: 'Prediabetes / Borderline HbA1c (5.7%–6.4%)',
    shortTagZh: '血糖偏高',
    severityLabelsZh: {
      MILD_STABLE: '空腹血糖 5.6–6.0 mmol/L · 糖化血紅素 HbA1c 5.7%–6.0%（毋須服藥、BMI 正常）',
      MODERATE_MONITORED: 'HbA1c 6.1%–6.4% 或輕微二型糖尿病單服 Metformin 控制 HbA1c < 6.8%',
      UNINVESTIGATED_HIGH: 'HbA1c >= 7.0% 或需注射胰島素／合併視網膜或腎蛋白尿',
    },
    severityLabelsEn: {
      MILD_STABLE: 'Fasting glucose 5.6–6.0, HbA1c 5.7%–6.0%, diet-controlled, normal BMI',
      MODERATE_MONITORED: 'HbA1c 6.1%–6.4% or mild T2DM on Metformin with HbA1c <6.8%',
      UNINVESTIGATED_HIGH: 'HbA1c >=7.0% or insulin-treated / microvascular complications',
    },
    requiredReportsZh: [
      '近 3–6 個月空腹血糖（Fasting Glucose）及糖化血紅素（HbA1c — 反映過去3個月平均血糖）',
      '如有需要可附口服葡萄糖耐量測試（75g OGTT）及尿微白蛋白（Urine Microalbumin）報告',
    ],
    requiredReportsEn: [
      'Fasting plasma glucose & HbA1c within 3–6 months',
      '75g OGTT and urine microalbumin/creatinine ratio if available',
    ],
    advisorCoachingTipZh:
      '已確診輕微糖尿病客戶並非無保險買！香港現有「三高簡化核保醫保（如中銀易康護）」、「安達糖癒系列」、「專項抗癌保（不問糖尿）」及免驗身多元貨幣儲蓄／QDAP 可精準組合！',
    advisorCoachingTipEn:
      'Clients with mild T2DM can pair 3-Highs simplified medical plans, Chubb diabetes-friendly tracks, pure Cancer plans, and GIO Savings/QDAP.',
    outcomesBySeverity: {
      MILD_STABLE: {
        medicalVhis: {
          outcome: 'LOADING',
          noteZh: '減重控糖後 HbA1c < 6.0% 有機會標準或輕微加費 +20%~+30%',
          noteEn: 'Standard or +20–30% loading when HbA1c <6.0% and BMI normal',
          loadingPct: 25,
        },
        criticalIllness: {
          outcome: 'LOADING',
          noteZh: '一般加費 +25% 至 +35%',
          noteEn: '+25–35% loading',
          loadingPct: 25,
        },
        lifeTermUl: {
          outcome: 'STANDARD',
          noteZh: '標準或輕微加費 +15%~+25%',
          noteEn: 'Standard to +25% loading',
          loadingPct: 15,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '免驗身標準批核',
          noteEn: 'GIO Standard',
          loadingPct: 0,
        },
      },
      MODERATE_MONITORED: {
        medicalVhis: {
          outcome: 'LOADING',
          noteZh: '傳統 VHIS 多拒保或重度加費；強烈建議轉配「三高簡化核保醫保」或「專項抗癌醫保」',
          noteEn: 'Standard VHIS tough; pivot to 3-Highs simplified medical or Cancer medical plan',
          loadingPct: 50,
        },
        criticalIllness: {
          outcome: 'LOADING_OR_EXCLUSION',
          noteZh: '建議選配「糖癒簡化核保方案」或「純癌症危疾保（只問腫瘤史）」',
          noteEn: 'Recommend diabetes-simplified track or Cancer-only CI protection',
          loadingPct: 50,
        },
        lifeTermUl: {
          outcome: 'LOADING',
          noteZh: '受控二型糖尿人壽一般加費 +50% 至 +75%',
          noteEn: '+50–75% mortality loading on Life',
          loadingPct: 55,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '免驗身多元貨幣儲蓄及扣稅年金 100% 標準受保',
          noteEn: '100% GIO Standard on Savings & QDAP',
          loadingPct: 0,
        },
      },
      UNINVESTIGATED_HIGH: {
        medicalVhis: {
          outcome: 'POSTPONE_REPORT_FIRST',
          noteZh: '傳統醫保拒保；可改配「純癌症醫療保（如友邦癌症全方位／富衛癌護您）」或免核保儲蓄',
          noteEn: 'Pivot to dedicated Oncology Medical plans or GIO Savings/Annuity',
          loadingPct: 0,
        },
        criticalIllness: {
          outcome: 'POSTPONE_REPORT_FIRST',
          noteZh: '傳統危疾拒保；優先配置免健康核保多元貨幣儲蓄自製醫療儲備金',
          noteEn: 'Build dedicated medical sinking fund via GIO Participating Savings',
          loadingPct: 0,
        },
        lifeTermUl: {
          outcome: 'POSTPONE_REPORT_FIRST',
          noteZh: '需先將 HbA1c 控制至 < 7.0% 再評估',
          noteEn: 'Stabilize HbA1c <7.0% first',
          loadingPct: 0,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '免健康問題儲蓄分紅及香港年金／QDAP 照常標準受保！',
          noteEn: 'GIO Savings & HKMC/QDAP Annuity guaranteed standard issue!',
          loadingPct: 0,
        },
      },
    },
  },
  {
    code: 'SLEEP_APNEA',
    labelZh: '睡眠窒息症（CPAP 呼吸機）',
    labelEn: 'Obstructive Sleep Apnea (AHI / CPAP)',
    shortTagZh: '睡眠窒息',
    severityLabelsZh: {
      MILD_STABLE: '輕度睡眠窒息（AHI < 15）且血壓正常、無日間嗜睡或心律不正',
      MODERATE_MONITORED: '中度（AHI 15–30）每晚規律佩戴正壓呼吸機（CPAP）且心肺指標正常',
      UNINVESTIGATED_HIGH: '重度（AHI > 30）未佩戴呼吸機 或 合併高血壓／肥胖（BMI > 30）',
    },
    severityLabelsEn: {
      MILD_STABLE: 'Mild OSA (AHI <15), normal BP & BMI, no arrhythmia',
      MODERATE_MONITORED: 'Moderate OSA (AHI 15–30) compliant with nightly CPAP',
      UNINVESTIGATED_HIGH: 'Severe untreated OSA (AHI >30) or comorbid hypertension/obesity',
    },
    requiredReportsZh: [
      '睡眠多維圖測試報告（Polysomnography / Sleep Study — 列明 AHI 指數及最低血氧飽和度 SpO2）',
      '呼吸機使用依從性數據下載紀錄（CPAP Compliance Report — 證明每晚使用 >= 4–6 小時極有幫助！）',
    ],
    requiredReportsEn: [
      'Sleep Study (Polysomnography) report showing AHI score & minimum SpO2',
      'CPAP machine compliance usage report (>=4–6h/night strengthens underwriting)',
    ],
    advisorCoachingTipZh:
      '主動附上 CPAP 呼吸機 SD 卡／App 依從性報告（證明每晚有戴機），核保部會大幅調低心血管風險評級！',
    advisorCoachingTipEn:
      'Attaching a CPAP compliance download report significantly reduces cardiovascular loading!',
    outcomesBySeverity: {
      MILD_STABLE: {
        medicalVhis: {
          outcome: 'EXCLUSION',
          noteZh: '多數批「睡眠窒息症及相關鼻鼾手術除外」，其他住院手術正常受保',
          noteEn: 'Sleep apnea exclusion; full hospital cover for all other conditions',
          loadingPct: 0,
        },
        criticalIllness: {
          outcome: 'STANDARD',
          noteZh: '輕度 AHI < 15 且血壓 BMI 正常者，危疾大機會「標準受保」',
          noteEn: 'Often Standard on Critical Illness when mild and normotensive',
          loadingPct: 0,
        },
        lifeTermUl: {
          outcome: 'STANDARD',
          noteZh: '標準受保',
          noteEn: 'Standard rate',
          loadingPct: 0,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '免驗身標準批核',
          noteEn: 'GIO Standard',
          loadingPct: 0,
        },
      },
      MODERATE_MONITORED: {
        medicalVhis: {
          outcome: 'LOADING_OR_EXCLUSION',
          noteZh: '睡眠窒息除外 ＋ 視乎 BMI 輕微加費 +20%~+30%',
          noteEn: 'OSA exclusion + mild +20–30% loading if BMI elevated',
          loadingPct: 25,
        },
        criticalIllness: {
          outcome: 'LOADING',
          noteZh: '規律戴 CPAP 者一般加費 +25% 至 +35%',
          noteEn: '+25–35% loading with good CPAP compliance',
          loadingPct: 30,
        },
        lifeTermUl: {
          outcome: 'LOADING',
          noteZh: '輕微加費 +20%~+25%',
          noteEn: '+20–25% loading',
          loadingPct: 20,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '免驗身零加價',
          noteEn: 'GIO Standard',
          loadingPct: 0,
        },
      },
      UNINVESTIGATED_HIGH: {
        medicalVhis: {
          outcome: 'POSTPONE_REPORT_FIRST',
          noteZh: '重度未治療多會延期；可先配專項抗癌保及免驗身儲蓄方案',
          noteEn: 'Deferred until CPAP initiated; pure Cancer & GIO Savings open',
          loadingPct: 50,
        },
        criticalIllness: {
          outcome: 'POSTPONE_REPORT_FIRST',
          noteZh: '建議先開始 CPAP 治療 3–6 個月再投保全面危疾，或先買純癌症保',
          noteEn: 'Initiate CPAP for 3–6m or start with Cancer-only protection',
          loadingPct: 50,
        },
        lifeTermUl: {
          outcome: 'LOADING',
          noteZh: '重度加費 +50%~+75%',
          noteEn: '+50–75% loading',
          loadingPct: 60,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '免健康核保儲蓄及年金即時標準受保',
          noteEn: 'GIO Savings & Annuity approved at Standard',
          loadingPct: 0,
        },
      },
    },
  },
  {
    code: 'GYN_FIBROID_CYST',
    labelZh: '子宮肌瘤／卵巢水瘤',
    labelEn: 'Uterine Fibroid / Ovarian Cyst',
    shortTagZh: '子宮肌瘤',
    severityLabelsZh: {
      MILD_STABLE: '子宮肌瘤 < 4cm 無貧血經血過多，或單純卵巢生理性水囊已消退／切除良性',
      MODERATE_MONITORED: '肌瘤 4–6cm 定期婦科超聲波穩定，或朱古力瘤（子宮內膜異位）觀察中',
      UNINVESTIGATED_HIGH: '肌瘤 > 6–7cm 醫生建議手術切除，或伴隨嚴重缺鐵性貧血（Hb < 9）',
    },
    severityLabelsEn: {
      MILD_STABLE: 'Fibroid <4cm asymptomatic without anemia, or resolved/excised benign cyst',
      MODERATE_MONITORED: 'Fibroid 4–6cm stable on pelvic USG or endometriosis cyst monitored',
      UNINVESTIGATED_HIGH: 'Fibroid >6–7cm awaiting surgery or complicated by severe anemia',
    },
    requiredReportsZh: [
      '近 6–12 個月婦科盆腔超聲波報告（Pelvic Ultrasound — 列明尺寸 cm、數量及卵巢狀況）',
      '血色素全血圖報告（CBC / Hemoglobin — 證明無因經血過多引致貧血）及柏氏抹片正常紀錄',
    ],
    requiredReportsEn: [
      'Pelvic Ultrasound within 6–12 months detailing exact dimensions (cm) & ovaries',
      'Complete Blood Count (Hemoglobin) & normal Pap smear record',
    ],
    advisorCoachingTipZh:
      '小於 4cm 且無貧血之單純子宮肌瘤，在危疾及人壽保單幾乎全市場可獲「標準受保（連子宮頸癌／卵巢癌照保）」！醫療單則僅除外肌瘤本身。',
    advisorCoachingTipEn:
      'Small (<4cm) asymptomatic fibroids without anemia almost always achieve 100% Standard Critical Illness & Life acceptance!',
    outcomesBySeverity: {
      MILD_STABLE: {
        medicalVhis: {
          outcome: 'EXCLUSION',
          noteZh: 'VHIS／私家醫保一般設「子宮肌瘤除外」（如已手術切除痊癒滿1年可爭取標準受保）',
          noteEn: 'Uterine fibroid exclusion (or Standard if surgically cured >12m ago)',
          loadingPct: 0,
        },
        criticalIllness: {
          outcome: 'STANDARD',
          noteZh: '肌瘤屬良性平滑肌增生，不增加癌症風險，危疾普遍 100%「標準受保」！',
          noteEn: '100% Standard Critical Illness including gynecological cancers!',
          loadingPct: 0,
        },
        lifeTermUl: {
          outcome: 'STANDARD',
          noteZh: '標準受保（Standard）',
          noteEn: 'Standard rate',
          loadingPct: 0,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '免驗身標準批核',
          noteEn: 'GIO Standard',
          loadingPct: 0,
        },
      },
      MODERATE_MONITORED: {
        medicalVhis: {
          outcome: 'EXCLUSION',
          noteZh: '子宮肌瘤／內膜異位除外，其他全身住院手術照常全保',
          noteEn: 'Fibroid/endometriosis excluded; all other inpatient surgical covered',
          loadingPct: 0,
        },
        criticalIllness: {
          outcome: 'STANDARD',
          noteZh: '無貧血者危疾多可「標準受保」',
          noteEn: 'Standard acceptance on CI when hemoglobin is normal',
          loadingPct: 0,
        },
        lifeTermUl: {
          outcome: 'STANDARD',
          noteZh: '標準受保',
          noteEn: 'Standard rate',
          loadingPct: 0,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '免驗身標準批核',
          noteEn: 'GIO Standard',
          loadingPct: 0,
        },
      },
      UNINVESTIGATED_HIGH: {
        medicalVhis: {
          outcome: 'POSTPONE_REPORT_FIRST',
          noteZh: '待手術切除康復及血色素回升後投保醫保，或先批子宮除外（視保司而定）',
          noteEn: 'Complete scheduled myomectomy & anemia recovery, or uterine exclusion',
          loadingPct: 0,
        },
        criticalIllness: {
          outcome: 'POSTPONE_REPORT_FIRST',
          noteZh: '嚴重貧血或待手術期間一般暫緩，手術病理確認良性後即可標準受保！',
          noteEn: 'Standard CI readily available right after benign post-op pathology!',
          loadingPct: 0,
        },
        lifeTermUl: {
          outcome: 'LOADING',
          noteZh: '待改善貧血或術後標準受保',
          noteEn: 'Standard post-recovery',
          loadingPct: 20,
        },
        savingsQdap: {
          outcome: 'GIO_NO_HEALTH_QUESTIONS',
          noteZh: '免驗身儲蓄及年金不受影響',
          noteEn: 'GIO Savings & Annuity unaffected',
          loadingPct: 0,
        },
      },
    },
  },
];

export interface PreUwMatchedPlanItem {
  plan: InsurancePlan;
  outcome: UwDecisionOutcome;
  fitScore: number;
  fitBadgeZh: string;
  fitBadgeEn: string;
  rationaleZh: string;
  rationaleEn: string;
  baseAnnualPremiumHkd: number;
  estimatedUnderwrittenAnnualHkd: number;
}

export interface PreUwEvaluationResult {
  profile: ConditionPreUwProfile;
  severity: PreUwSeverityTier;
  activePlanAssessment: PreUwMatchedPlanItem;
  matchedFriendlyPlans: PreUwMatchedPlanItem[];
  whatsappRequestScriptZh: string;
}

function scorePlanForPreUnderwriting(params: {
  plan: InsurancePlan;
  profile: ConditionPreUwProfile;
  severity: PreUwSeverityTier;
  age: number;
  isSmoker: boolean;
}): PreUwMatchedPlanItem {
  const { plan, profile, severity, age, isSmoker } = params;
  const matrix = profile.outcomesBySeverity[severity];
  const blob = `${plan.id} ${plan.nameZh} ${plan.nameEn} ${plan.keyHighlightsZh.join(' ')}`.toLowerCase();

  const isSimplifiedOrThreeHighs =
    /簡化核保|simplified|易衛您|易康護|每種守護|糖癒|心癒|癌癒|免驗身/.test(blob);
  const isCancerFocused =
    /癌|cancer|oncology|cansurance/.test(blob) &&
    !/thyroid|breast/.test(
      profile.code === 'THYROID_NODULE' || profile.code === 'BREAST_CYST_BENIGN'
        ? profile.code.toLowerCase()
        : ''
    );

  let bucket = matrix.savingsQdap;
  if (
    plan.category === PlanCategory.VHIS ||
    plan.category === PlanCategory.HIGH_END_MEDICAL
  ) {
    bucket = matrix.medicalVhis;
  } else if (plan.category === PlanCategory.CRITICAL_ILLNESS) {
    bucket = matrix.criticalIllness;
  } else if (
    plan.category === PlanCategory.TERM_LIFE ||
    plan.category === PlanCategory.UNIVERSAL_LIFE
  ) {
    bucket = matrix.lifeTermUl;
  }

  let outcome = bucket.outcome;
  let loadingPct = bucket.loadingPct;
  let fitScore = 72;
  let fitBadgeZh = '常規核保評估';
  let fitBadgeEn = 'Standard UW Track';
  let rationaleZh = bucket.noteZh;
  let rationaleEn = bucket.noteEn;

  if (
    plan.category === PlanCategory.PARTICIPATING_SAVINGS ||
    plan.category === PlanCategory.QDAP
  ) {
    outcome = 'GIO_NO_HEALTH_QUESTIONS';
    loadingPct = 0;
    fitScore = severity === 'UNINVESTIGATED_HIGH' ? 98 : 90;
    fitBadgeZh = '免驗身 GIO 直通批核';
    fitBadgeEn = 'GIO Zero-Medical Issue';
    rationaleZh = `${plan.insurerNameZh}免驗身簡易核保額度內毋須申報複雜醫療報告，零加價、零除外鎖定儲蓄／扣稅回報`;
    rationaleEn = `Guaranteed/simplified issue within GIO threshold — zero loading or exclusion`;
  } else if (isSimplifiedOrThreeHighs) {
    outcome = severity === 'UNINVESTIGATED_HIGH' ? 'LOADING' : 'STANDARD';
    loadingPct = severity === 'UNINVESTIGATED_HIGH' ? 15 : 0;
    fitScore = 96;
    fitBadgeZh = '簡化核保／亞健康友善首選';
    fitBadgeEn = 'Simplified-Issue Friendly';
    rationaleZh = `專為有體檢紀錄或受控三高人士設計之簡化健康問題產品，大幅提升直接批核成功率`;
    rationaleEn = `Engineered with streamlined health questions friendly to sub-standard checkup histories`;
  } else if (
    isCancerFocused &&
    (profile.code === 'HYPERTENSION_CONTROLLED' ||
      profile.code === 'HYPERLIPIDEMIA' ||
      profile.code === 'PREDIABETES' ||
      profile.code === 'SLEEP_APNEA')
  ) {
    outcome = 'STANDARD';
    loadingPct = 0;
    fitScore = 94;
    fitBadgeZh = '專項抗癌（不問三高血壓）';
    fitBadgeEn = 'Oncology Focus (3-Highs Exempt)';
    rationaleZh = `專注腫瘤風險評估，不受血壓／血脂／血糖紀錄影響，可標準保費鎖定高額癌症實報實銷或一筆過保障`;
    rationaleEn = `Focuses strictly on oncology history — unaffected by blood pressure, lipids or prediabetes`;
  } else if (plan.category === PlanCategory.VHIS && outcome !== 'POSTPONE_REPORT_FIRST') {
    fitScore = outcome === 'STANDARD' ? 92 : 85;
    fitBadgeZh = 'VHIS 法定保障未知已有病症';
    fitBadgeEn = 'VHIS Statutory Pre-Existing Rule';
    rationaleZh = `${bucket.noteZh}；且醫務衞生局認可 VHIS 條款保證續保至 100 歲並涵蓋其他未知投保前病症`;
    rationaleEn = `${bucket.noteEn}; certified VHIS guarantees renewal to age 100`;
  } else if (outcome === 'STANDARD') {
    fitScore = 91;
    fitBadgeZh = '大機會標準受保';
    fitBadgeEn = 'High Standard Probability';
  } else if (outcome === 'POSTPONE_REPORT_FIRST') {
    fitScore = 45;
    fitBadgeZh = '建議先補齊報告再遞單';
    fitBadgeEn = 'Collect Reports Before Applying';
  }

  const quoteCurrency: CurrencyCode = plan.currencies.includes('HKD')
    ? 'HKD'
    : plan.currencies[0] || 'USD';
  const sumAssured = quoteCurrency === 'HKD' ? 1000000 : 130000;
  const term = plan.supportedPaymentTerms.includes(20)
    ? 20
    : plan.supportedPaymentTerms[0] || 10;

  const quote = calculateCompliantQuote({
    plan,
    age,
    isSmoker,
    currency: quoteCurrency,
    sumAssuredInSelectedCurrency: sumAssured,
    paymentTermYears: term,
  });

  const baseHkd =
    quoteCurrency === 'HKD'
      ? quote.annualPremium
      : Math.round((quote.annualPremium / FX_RATES_FROM_USD[quoteCurrency]) * 7.8);

  const estimatedUnderwrittenAnnualHkd = Math.round(baseHkd * (1 + loadingPct / 100));

  return {
    plan,
    outcome,
    fitScore,
    fitBadgeZh,
    fitBadgeEn,
    rationaleZh,
    rationaleEn,
    baseAnnualPremiumHkd: baseHkd,
    estimatedUnderwrittenAnnualHkd,
  };
}

export function evaluatePreUnderwritingAndMatchPlans(params: {
  conditionCode: HealthImpairmentCode;
  severity: PreUwSeverityTier;
  lead: ClientLead;
  activePlan: InsurancePlan;
  allPlans: InsurancePlan[];
  advisorNameZh?: string;
}): PreUwEvaluationResult {
  const {
    conditionCode,
    severity,
    lead,
    activePlan,
    allPlans,
    advisorNameZh = '您的保險顧問',
  } = params;

  const profile =
    PRE_UW_CONDITION_PROFILES.find((c) => c.code === conditionCode) ||
    PRE_UW_CONDITION_PROFILES[0];

  const activePlanAssessment = scorePlanForPreUnderwriting({
    plan: activePlan,
    profile,
    severity,
    age: lead.age,
    isSmoker: lead.isSmoker,
  });

  const scoredAll = allPlans
    .filter((p) => p.category !== PlanCategory.GENERAL_GI)
    .map((p) =>
      scorePlanForPreUnderwriting({
        plan: p,
        profile,
        severity,
        age: lead.age,
        isSmoker: lead.isSmoker,
      })
    )
    .sort((a, b) => b.fitScore - a.fitScore || a.estimatedUnderwrittenAnnualHkd - b.estimatedUnderwrittenAnnualHkd);

  // Pick diverse top 8 across categories & insurers
  const matchedFriendlyPlans: PreUwMatchedPlanItem[] = [];
  const seenInsurerCat = new Set<string>();
  for (const item of scoredAll) {
    const key = `${item.plan.insurerCode}-${item.plan.category}`;
    if (seenInsurerCat.has(key) && matchedFriendlyPlans.length < 6) continue;
    seenInsurerCat.add(key);
    matchedFriendlyPlans.push(item);
    if (matchedFriendlyPlans.length >= 8) break;
  }

  const whatsappRequestScriptZh = `你好 ${lead.fullNameZh}！關於我哋傾開嘅「[${activePlan.insurerNameZh}] ${activePlan.nameZh}」預先核保（Pre-underwriting）評估，為咗幫你爭取最靚嘅核保條件（避免無謂紀錄），麻煩你得閒時喺手機「醫健通 eHealth」或者私家診所搵一搵以下報告影相發畀我先做匿名初步評估：\n${profile.requiredReportsZh
    .map((r, idx) => `${idx + 1}. ${r}`)
    .join('\n')}\n收齊後我會幫你對比埋幾間核保最寬鬆嘅保司條款再同你匯報！— ${advisorNameZh}`;

  return {
    profile,
    severity,
    activePlanAssessment,
    matchedFriendlyPlans,
    whatsappRequestScriptZh,
  };
}

// ============================================================================
// TOOL 2: 「即將轉保齡／追溯保齡（Backdate）」慳保費自動提醒名單（配對全產品庫）
// ============================================================================

export type BirthdayWindowStatus =
  | 'UPCOMING_45D'
  | 'BACKDATE_180D'
  | 'NORMAL_MONITOR';

export interface PlanBackdateSavingComparison {
  plan: InsurancePlan;
  currency: CurrencyCode;
  paymentTermYears: number;
  youngerAge: number;
  olderAge: number;
  annualPremiumYoungerHkd: number;
  annualPremiumOlderHkd: number;
  annualSavedHkd: number;
  totalTermSavedHkd: number;
}

export interface LeadBirthdayBackdateRow {
  lead: ClientLead;
  effectiveBirthdayMmDd: string;
  windowStatus: BirthdayWindowStatus;
  daysUntilNextBirthday: number;
  daysSinceLastBirthday: number;
  remainingBackdateDays: number;
  youngerInsuranceAge: number;
  olderInsuranceAge: number;
  statusBadgeZh: string;
  statusBadgeEn: string;
  selectedPlanSaving: PlanBackdateSavingComparison;
  topMatchedPlans: PlanBackdateSavingComparison[];
  whatsappReminderZh: string;
}

function deriveFallbackBirthdayMmDd(leadId: string, refDate: Date): string {
  // Deterministic realistic birthday offsets when birthdayMonthDay is not yet set on a newly created lead
  let hash = 0;
  for (let i = 0; i < leadId.length; i++) {
    hash = (hash * 31 + leadId.charCodeAt(i)) % 365;
  }
  const offsetDays = hash % 2 === 0 ? 18 + (hash % 24) : -(35 + (hash % 110));
  const d = new Date(refDate.getTime() + offsetDays * 86400000);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(Math.min(28, d.getUTCDate())).padStart(2, '0');
  return `${mm}-${dd}`;
}

function computeSinglePlanAgeDeltaSaving(params: {
  plan: InsurancePlan;
  youngerAge: number;
  isSmoker: boolean;
  sumAssuredHkd: number;
}): PlanBackdateSavingComparison {
  const { plan, youngerAge, isSmoker, sumAssuredHkd } = params;
  const olderAge = Math.min(80, youngerAge + 1);
  const quoteCurr: CurrencyCode = plan.currencies.includes('HKD')
    ? 'HKD'
    : plan.currencies[0] || 'USD';
  const fx = FX_RATES_FROM_USD[quoteCurr];
  const saInCurr =
    quoteCurr === 'HKD' ? sumAssuredHkd : Math.round((sumAssuredHkd / 7.8) * fx);
  const term = plan.supportedPaymentTerms.includes(20)
    ? 20
    : plan.supportedPaymentTerms.includes(10)
    ? 10
    : plan.supportedPaymentTerms[0] || 10;

  const qYoung = calculateCompliantQuote({
    plan,
    age: youngerAge,
    isSmoker,
    currency: quoteCurr,
    sumAssuredInSelectedCurrency: saInCurr,
    paymentTermYears: term,
  });
  const qOld = calculateCompliantQuote({
    plan,
    age: olderAge,
    isSmoker,
    currency: quoteCurr,
    sumAssuredInSelectedCurrency: saInCurr,
    paymentTermYears: term,
  });

  const toHkd = (val: number) =>
    quoteCurr === 'HKD' ? val : Math.round((val / fx) * 7.8);

  const annualPremiumYoungerHkd = toHkd(qYoung.annualPremium);
  const annualPremiumOlderHkd = toHkd(qOld.annualPremium);
  const annualSavedHkd = Math.max(0, annualPremiumOlderHkd - annualPremiumYoungerHkd);
  const effectiveHorizon =
    plan.category === PlanCategory.VHIS || plan.category === PlanCategory.HIGH_END_MEDICAL
      ? 20
      : qYoung.paymentTermYears;
  const totalTermSavedHkd = annualSavedHkd * effectiveHorizon;

  return {
    plan,
    currency: quoteCurr,
    paymentTermYears: effectiveHorizon,
    youngerAge,
    olderAge,
    annualPremiumYoungerHkd,
    annualPremiumOlderHkd,
    annualSavedHkd,
    totalTermSavedHkd,
  };
}

export function computeBirthdayBackdateRadar(params: {
  leads: ClientLead[];
  activePlan: InsurancePlan;
  allPlans: InsurancePlan[];
  sumAssuredHkd?: number;
  referenceDateIso?: string;
  advisorNameZh?: string;
}): LeadBirthdayBackdateRow[] {
  const {
    leads,
    activePlan,
    allPlans,
    sumAssuredHkd = 1500000,
    referenceDateIso,
    advisorNameZh = '您的保險顧問',
  } = params;

  const refDate = referenceDateIso ? new Date(`${referenceDateIso}T00:00:00Z`) : new Date();
  const refYear = refDate.getUTCFullYear();

  const rows: LeadBirthdayBackdateRow[] = leads.map((lead) => {
    const mmDd =
      lead.birthdayMonthDay && /^\d{2}-\d{2}$/.test(lead.birthdayMonthDay)
        ? lead.birthdayMonthDay
        : deriveFallbackBirthdayMmDd(lead.id, refDate);
    const [mmStr, ddStr] = mmDd.split('-');
    const bMonth = Math.max(1, Math.min(12, Number(mmStr) || 1)) - 1;
    const bDay = Math.max(1, Math.min(31, Number(ddStr) || 15));

    const thisYearBday = new Date(Date.UTC(refYear, bMonth, bDay));
    const diffMs = thisYearBday.getTime() - refDate.getTime();
    const diffDays = Math.round(diffMs / 86400000);

    let daysUntilNextBirthday: number;
    let daysSinceLastBirthday: number;
    if (diffDays >= 0) {
      daysUntilNextBirthday = diffDays;
      const lastBday = new Date(Date.UTC(refYear - 1, bMonth, bDay));
      daysSinceLastBirthday = Math.round((refDate.getTime() - lastBday.getTime()) / 86400000);
    } else {
      daysSinceLastBirthday = Math.abs(diffDays);
      const nextBday = new Date(Date.UTC(refYear + 1, bMonth, bDay));
      daysUntilNextBirthday = Math.round((nextBday.getTime() - refDate.getTime()) / 86400000);
    }

    let windowStatus: BirthdayWindowStatus = 'NORMAL_MONITOR';
    let youngerInsuranceAge = lead.age;
    let olderInsuranceAge = Math.min(80, lead.age + 1);
    let statusBadgeZh = `距下個生日 ${daysUntilNextBirthday} 日`;
    let statusBadgeEn = `${daysUntilNextBirthday}d to next birthday`;

    if (daysUntilNextBirthday <= 45) {
      windowStatus = 'UPCOMING_45D';
      youngerInsuranceAge = lead.age;
      olderInsuranceAge = Math.min(80, lead.age + 1);
      statusBadgeZh = `即將轉保齡 · 尚餘 ${daysUntilNextBirthday} 日生日`;
      statusBadgeEn = `Age Change in ${daysUntilNextBirthday}d`;
    } else if (daysSinceLastBirthday <= 180) {
      windowStatus = 'BACKDATE_180D';
      youngerInsuranceAge = Math.max(18, lead.age - 1);
      olderInsuranceAge = lead.age;
      const rem = 180 - daysSinceLastBirthday;
      statusBadgeZh = `生日已過 ${daysSinceLastBirthday} 日 · 可追溯保齡（尚餘 ${rem} 日窗口）`;
      statusBadgeEn = `Backdate Eligible (${rem}d window left)`;
    }

    const remainingBackdateDays = Math.max(0, 180 - daysSinceLastBirthday);

    const selectedPlanSaving = computeSinglePlanAgeDeltaSaving({
      plan: activePlan,
      youngerAge: youngerInsuranceAge,
      isSmoker: lead.isSmoker,
      sumAssuredHkd,
    });

    const topMatchedPlans = allPlans
      .filter(
        (p) =>
          p.category === PlanCategory.CRITICAL_ILLNESS ||
          p.category === PlanCategory.TERM_LIFE ||
          p.category === PlanCategory.PARTICIPATING_SAVINGS ||
          p.category === PlanCategory.VHIS
      )
      .slice(0, 40)
      .map((p) =>
        computeSinglePlanAgeDeltaSaving({
          plan: p,
          youngerAge: youngerInsuranceAge,
          isSmoker: lead.isSmoker,
          sumAssuredHkd,
        })
      )
      .sort((a, b) => b.totalTermSavedHkd - a.totalTermSavedHkd)
      .slice(0, 5);

    const whatsappReminderZh =
      windowStatus === 'UPCOMING_45D'
        ? `你好 ${lead.fullNameZh}！溫馨提提你，仲有 ${daysUntilNextBirthday} 日就到你生日轉新一個投保年齡（${youngerInsuranceAge} 歲 -> ${olderInsuranceAge} 歲）啦🎂！以我哋睇緊嘅「[${activePlan.insurerNameZh}] ${activePlan.nameZh}」為例，趕喺生日前鎖定 ${youngerInsuranceAge} 歲保費率，每年即慳 HK$${selectedPlanSaving.annualSavedHkd.toLocaleString()}，全期合共慳足 HK$${selectedPlanSaving.totalTermSavedHkd.toLocaleString()}！想唔想今個星期幫你鎖定咗個年輕費率同優惠先？— ${advisorNameZh}`
        : windowStatus === 'BACKDATE_180D'
        ? `你好 ${lead.fullNameZh}！雖然你生日啱啱過咗 ${daysSinceLastBirthday} 日，但香港保險公司容許「追溯保單生效日（Backdate 最多 180 日）」鎖返你生日前 ${youngerInsuranceAge} 歲嘅平保費率！以「[${activePlan.insurerNameZh}] ${activePlan.nameZh}」計，全期足足慳返 HK$${selectedPlanSaving.totalTermSavedHkd.toLocaleString()}（仲有 ${remainingBackdateDays} 日追溯限期），我幫你出一份鎖齡對比表畀你過目？— ${advisorNameZh}`
        : `你好 ${lead.fullNameZh}！幫你計過「[${activePlan.insurerNameZh}] ${activePlan.nameZh}」目前 ${youngerInsuranceAge} 歲投保比下年 ${olderInsuranceAge} 歲全期可慳 HK$${selectedPlanSaving.totalTermSavedHkd.toLocaleString()}，趁身體健康鎖定費率最著數！— ${advisorNameZh}`;

    return {
      lead,
      effectiveBirthdayMmDd: mmDd,
      windowStatus,
      daysUntilNextBirthday,
      daysSinceLastBirthday,
      remainingBackdateDays,
      youngerInsuranceAge,
      olderInsuranceAge,
      statusBadgeZh,
      statusBadgeEn,
      selectedPlanSaving,
      topMatchedPlans,
      whatsappReminderZh,
    };
  });

  const priorityOrder: Record<BirthdayWindowStatus, number> = {
    UPCOMING_45D: 0,
    BACKDATE_180D: 1,
    NORMAL_MONITOR: 2,
  };

  return rows.sort(
    (a, b) =>
      priorityOrder[a.windowStatus] - priorityOrder[b.windowStatus] ||
      b.selectedPlanSaving.totalTermSavedHkd - a.selectedPlanSaving.totalTermSavedHkd
  );
}

// ============================================================================
// TOOL 3: 公司團體醫保 ＋ 自願醫保「墊底費（Deductible）無縫接力」圖解計算機
// ============================================================================

export type DeductibleTierHkd = 0 | 16000 | 20000 | 25000 | 50000;

export interface PrivateHospitalSurgeryScenario {
  id: string;
  titleZh: string;
  titleEn: string;
  hospitalZh: string;
  wardTierZh: string;
  estimatedTotalBillHkd: number;
  typicalBreakdownZh: string;
}

export const HK_PRIVATE_SURGERY_SCENARIOS: PrivateHospitalSurgeryScenario[] = [
  {
    id: 'HKSH_LAPAROSCOPIC_GALLBLADDER',
    titleZh: '養和醫院 · 微創膽囊／盲腸切除手術',
    titleEn: 'HK Sanatorium · Laparoscopic Cholecystectomy (Semi-Private)',
    hospitalZh: '養和醫院（跑馬地）',
    wardTierZh: '半私家房（3日2夜）',
    estimatedTotalBillHkd: 148000,
    typicalBreakdownZh: '外科醫生費 $52k ＋ 麻醉師 $18k ＋ 手術室及儀器 $46k ＋ 病房雜費 $32k',
  },
  {
    id: 'GLENEAGLES_CORONARY_PCI',
    titleZh: '港怡醫院 · 冠狀動脈通波仔手術（1–2個支架）',
    titleEn: 'Gleneagles HK · Coronary Angioplasty PCI (Semi-Private)',
    hospitalZh: '港怡醫院（黃竹坑）',
    wardTierZh: '半私家房（套餐連耗材）',
    estimatedTotalBillHkd: 238000,
    typicalBreakdownZh: '心臟專科手術費 $75k ＋ 藥物塗層支架及導管耗材 $98k ＋ 監護病房 $65k',
  },
  {
    id: 'ST_TERESA_ACL_ORTHO',
    titleZh: '聖德肋撒（法國醫院）· 十字韌帶微創重建＋MRI',
    titleEn: 'St. Teresa’s Hospital · Arthroscopic ACL Reconstruction',
    hospitalZh: '聖德肋撒醫院（九龍城）',
    wardTierZh: '半私家房（3日2夜）',
    estimatedTotalBillHkd: 126000,
    typicalBreakdownZh: '骨科醫生及麻醉師 $58k ＋ 手術室及人工韌帶釘 $44k ＋ 住院及物理治療 $24k',
  },
  {
    id: 'HKSH_COLON_CANCER_SURGERY',
    titleZh: '養和醫院 · 結直腸腫瘤切除＋首階段標靶治療',
    titleEn: 'HK Sanatorium · Colorectal Oncology Surgery + Targeted Therapy',
    hospitalZh: '養和醫院（跑馬地）',
    wardTierZh: '半私家房（7日住院＋標靶）',
    estimatedTotalBillHkd: 360000,
    typicalBreakdownZh: '微創腫瘤切除及住院 $210k ＋ 基因檢測及首階段標靶藥物 $150k',
  },
  {
    id: 'MATILDA_PRIVATE_MAJOR',
    titleZh: '明德國際醫院 · 複雜婦科／泌尿微創手術（私家房）',
    titleEn: 'Matilda International · Major Minimally Invasive Surgery (Private Room)',
    hospitalZh: '明德國際醫院（山頂）',
    wardTierZh: '私家獨立套房（4日3夜）',
    estimatedTotalBillHkd: 285000,
    typicalBreakdownZh: '主刀及麻醉團隊 $115k ＋ 私家房手術室溢價及住院護理 $170k',
  },
];

export interface MatchedDeductibleMedicalPlanRow {
  plan: InsurancePlan;
  supportsDeductibleOptions: boolean;
  zeroDeductibleAnnualHkd: number;
  selectedDeductibleAnnualHkd: number;
  annualPremiumSavedHkd: number;
  workingYearsTotalSavedHkd: number;
  irdAnnualTaxSavedHkd: number;
  netEffectiveAnnualAfterTaxHkd: number;
  retirementZeroUwStepDownNoteZh: string;
}

export interface GroupVhisDeductibleRelayResult {
  scenario: PrivateHospitalSurgeryScenario;
  totalBillHkd: number;
  employerGroupCapHkd: number;
  selectedDeductibleHkd: DeductibleTierHkd;
  groupMedicalPayoutHkd: number;
  deductibleAbsorbedByGroupHkd: number;
  unmetDeductibleGapHkd: number;
  personalVhisRelayPayoutHkd: number;
  clientNetOutOfPocketHkd: number;
  withoutPersonalVhisShortfallHkd: number;
  isSeamlessZeroOutOfPocket: boolean;
  recommendedDeductibleHkd: DeductibleTierHkd;
  matchedMedicalPlans: MatchedDeductibleMedicalPlanRow[];
  whatsappPitchZh: string;
}

const DEDUCTIBLE_DISCOUNT_FACTOR: Record<DeductibleTierHkd, number> = {
  0: 1.0,
  16000: 0.68, // ~32% discount
  20000: 0.62, // ~38% discount
  25000: 0.57, // ~43% discount
  50000: 0.45, // ~55% discount
};

export function simulateGroupToVhisDeductibleRelay(params: {
  lead: ClientLead;
  allPlans: InsurancePlan[];
  activePlan?: InsurancePlan;
  scenarioId: string;
  customBillHkd?: number;
  employerGroupCapHkd: number;
  selectedDeductibleHkd: DeductibleTierHkd;
  advisorNameZh?: string;
}): GroupVhisDeductibleRelayResult {
  const {
    lead,
    allPlans,
    activePlan,
    scenarioId,
    customBillHkd,
    employerGroupCapHkd,
    selectedDeductibleHkd,
    advisorNameZh = '您的保險顧問',
  } = params;

  const baseScenario =
    HK_PRIVATE_SURGERY_SCENARIOS.find((s) => s.id === scenarioId) ||
    HK_PRIVATE_SURGERY_SCENARIOS[0];

  const totalBillHkd = Math.max(
    10000,
    customBillHkd && customBillHkd > 0 ? customBillHkd : baseScenario.estimatedTotalBillHkd
  );
  const safeGroupCap = Math.max(0, employerGroupCapHkd);

  const groupMedicalPayoutHkd = Math.min(totalBillHkd, safeGroupCap);
  const withoutPersonalVhisShortfallHkd = Math.max(0, totalBillHkd - groupMedicalPayoutHkd);

  // Under HK VHIS Flexi / High-End Medical deductible rules:
  // Reimbursable from Group Medical counts toward satisfying the Personal VHIS annual deductible!
  const deductibleAbsorbedByGroupHkd = Math.min(selectedDeductibleHkd, groupMedicalPayoutHkd);
  const unmetDeductibleGapHkd = Math.max(0, selectedDeductibleHkd - groupMedicalPayoutHkd);
  const coveredThreshold = Math.max(groupMedicalPayoutHkd, selectedDeductibleHkd);
  const personalVhisRelayPayoutHkd = Math.max(0, totalBillHkd - coveredThreshold);
  const clientNetOutOfPocketHkd = Math.min(totalBillHkd - groupMedicalPayoutHkd, unmetDeductibleGapHkd);
  const isSeamlessZeroOutOfPocket = clientNetOutOfPocketHkd === 0;

  // Recommend highest deductible that is still <= employerGroupCapHkd so client pays HK$0 out of pocket!
  const tiers: DeductibleTierHkd[] = [50000, 25000, 20000, 16000, 0];
  const recommendedDeductibleHkd =
    tiers.find((t) => t <= safeGroupCap) ?? 0;

  const yearsToRetire = Math.max(5, Math.min(35, lead.plannedRetirementAge - lead.age));
  const chargeableIncome = Math.max(
    180000,
    ((lead.fnaRecord?.monthlyIncomeHkd || 55000) * 12) - 132000
  );

  const medicalCatalog = allPlans.filter(
    (p) =>
      p.category === PlanCategory.VHIS || p.category === PlanCategory.HIGH_END_MEDICAL
  );

  const matchedMedicalPlans: MatchedDeductibleMedicalPlanRow[] = medicalCatalog
    .map((plan) => {
      const isStandardVhis =
        plan.nameZh.includes('標準計劃') || plan.nameEn.toLowerCase().includes('standard');
      const supportsDeductibleOptions = !isStandardVhis;

      const baseQuote = calculateCompliantQuote({
        plan,
        age: lead.age,
        isSmoker: lead.isSmoker,
        currency: 'HKD',
        sumAssuredInSelectedCurrency: 1000000,
        paymentTermYears: 1,
      });

      const zeroDeductibleAnnualHkd = baseQuote.annualPremium;
      const discountMult = supportsDeductibleOptions
        ? DEDUCTIBLE_DISCOUNT_FACTOR[selectedDeductibleHkd]
        : 1.0;
      const selectedDeductibleAnnualHkd = Math.round(zeroDeductibleAnnualHkd * discountMult);
      const annualPremiumSavedHkd = Math.max(
        0,
        zeroDeductibleAnnualHkd - selectedDeductibleAnnualHkd
      );
      const workingYearsTotalSavedHkd = annualPremiumSavedHkd * yearsToRetire;

      const irdAnnualTaxSavedHkd =
        plan.category === PlanCategory.VHIS
          ? calculateIrdSalariesTaxRelief({
              annualNetChargeableIncomeHkd: chargeableIncome,
              filingStatus: 'SINGLE',
              qdapAnnualPremiumHkd: 0,
              vhisInsuredCount: 1,
              vhisTotalPremiumHkd: selectedDeductibleAnnualHkd,
            }).annualTaxSavedHkd
          : 0;

      const netEffectiveAnnualAfterTaxHkd = Math.max(
        0,
        selectedDeductibleAnnualHkd - irdAnnualTaxSavedHkd
      );

      const retirementZeroUwStepDownNoteZh = supportsDeductibleOptions
        ? `${plan.insurerNameZh}支援於 55／60／65 歲指定退休年齡「免重新健康核保」將墊底費調低至 HK$0`
        : '政府標準計劃固定 HK$0 自付額（設有外科細項賠償上限，未能全數包底大額私院手術）';

      return {
        plan,
        supportsDeductibleOptions,
        zeroDeductibleAnnualHkd,
        selectedDeductibleAnnualHkd,
        annualPremiumSavedHkd,
        workingYearsTotalSavedHkd,
        irdAnnualTaxSavedHkd,
        netEffectiveAnnualAfterTaxHkd,
        retirementZeroUwStepDownNoteZh,
      };
    })
    .sort((a, b) => {
      if (activePlan && a.plan.id === activePlan.id) return -1;
      if (activePlan && b.plan.id === activePlan.id) return 1;
      if (a.supportsDeductibleOptions !== b.supportsDeductibleOptions) {
        return a.supportsDeductibleOptions ? -1 : 1;
      }
      return b.annualPremiumSavedHkd - a.annualPremiumSavedHkd;
    });

  const topPlan = matchedMedicalPlans[0];
  const whatsappPitchZh = `你好 ${lead.fullNameZh}！幫你用「${baseScenario.titleZh}（預計總收費 HK$${totalBillHkd.toLocaleString()}）」計咗條好實用嘅團保接力數：\n• 你現有公司團體醫保大約賠到：HK$${groupMedicalPayoutHkd.toLocaleString()}（若無個人醫保要自己補貼 HK$${withoutPersonalVhisShortfallHkd.toLocaleString()}）\n• 只要配搭「${topPlan?.plan.nameZh || '自願醫保靈活計劃'}」並揀 HK$${selectedDeductibleHkd.toLocaleString()} 墊底費：\n  1️⃣ 公司團保賠嘅錢可以直接抵銷墊底費，餘下 HK$${personalVhisRelayPayoutHkd.toLocaleString()} 由個人 VHIS 無縫全數接力，你實際自掏荷包只需 HK$${clientNetOutOfPocketHkd.toLocaleString()}！\n  2️⃣ 在職期間保費即減至每年 HK$${(topPlan?.selectedDeductibleAnnualHkd || 0).toLocaleString()}（扣埋稅每年實付約 HK$${(topPlan?.netEffectiveAnnualAfterTaxHkd || 0).toLocaleString()}），到退休前合共慳足 HK$${(topPlan?.workingYearsTotalSavedHkd || 0).toLocaleString()}，60/65歲退休仲可以免核保轉返 $0 墊底費！— ${advisorNameZh}`;

  return {
    scenario: baseScenario,
    totalBillHkd,
    employerGroupCapHkd: safeGroupCap,
    selectedDeductibleHkd,
    groupMedicalPayoutHkd,
    deductibleAbsorbedByGroupHkd,
    unmetDeductibleGapHkd,
    personalVhisRelayPayoutHkd,
    clientNetOutOfPocketHkd,
    withoutPersonalVhisShortfallHkd,
    isSeamlessZeroOutOfPocket,
    recommendedDeductibleHkd,
    matchedMedicalPlans,
    whatsappPitchZh,
  };
}

// ============================================================================
// TOOL 4: 儲蓄單「保單分拆（Policy Split）＋ 無限次轉受保人」跨代傳承時間軸
// ============================================================================

export interface FamilySplitBucketInput {
  id: string;
  holderLabelZh: string;
  holderLabelEn: string;
  targetCurrency: string;
  purposeZh: string;
  purposeEn: string;
  allocationPct: number;
}

export interface PolicySplitMilestoneNode {
  policyYear: number;
  clientAge: number;
  titleZh: string;
  titleEn: string;
  actionBadgeZh: string;
  masterOrCombinedValue: number;
  guaranteedFloorValue: number;
  bucketValues: Array<{
    id: string;
    holderLabelZh: string;
    targetCurrency: string;
    purposeZh: string;
    allocationPct: number;
    projectedValueInBaseCurrency: number;
  }>;
  descriptionZh: string;
}

export interface SavingsPolicySplitSimulationResult {
  selectedPlan: InsurancePlan;
  compatibleSavingsPlans: InsurancePlan[];
  earliestSplitYearAllowed: number;
  chosenSplitYear: number;
  currency: CurrencyCode;
  annualPremium: number;
  paymentTermYears: number;
  totalPrincipalPaid: number;
  effectiveIllustratedIrrPct: number;
  supportedCurrencyCountLabelZh: string;
  buckets: FamilySplitBucketInput[];
  milestones: PolicySplitMilestoneNode[];
  whatsappLegacySummaryZh: string;
}

export function buildDefaultFamilySplitBuckets(lead: ClientLead): FamilySplitBucketInput[] {
  const children = (lead.householdMembers || []).filter((m) => m.relation === 'CHILD');
  const spouse = (lead.householdMembers || []).find((m) => m.relation === 'SPOUSE');

  if (children.length >= 2) {
    return [
      {
        id: 'bucket-retire',
        holderLabelZh: `${lead.fullNameZh}${spouse ? ` 及 ${spouse.nameZh}` : ''}（本人退休倉）`,
        holderLabelEn: `${lead.fullNameEn} Retirement Sleeve`,
        targetCurrency: 'HKD / RMB',
        purposeZh: '65歲起每年提取被動退休長糧',
        purposeEn: 'Passive retirement income from age 65',
        allocationPct: 40,
      },
      {
        id: 'bucket-child1',
        holderLabelZh: `${children[0].nameZh}（子保單 A）`,
        holderLabelEn: `${children[0].nameEn} (Sub-Policy A)`,
        targetCurrency: 'GBP / USD',
        purposeZh: '轉英鎊／美元供海外大學學費及置業首期',
        purposeEn: 'Switch to GBP/USD for overseas university & home deposit',
        allocationPct: 30,
      },
      {
        id: 'bucket-child2',
        holderLabelZh: `${children[1].nameZh}（子保單 B）`,
        holderLabelEn: `${children[1].nameEn} (Sub-Policy B)`,
        targetCurrency: 'USD / CAD',
        purposeZh: '獨立轉受保人長線滾存並傳承第三代孫輩',
        purposeEn: 'Change insured & compound across 3rd generation',
        allocationPct: 30,
      },
    ];
  }

  if (children.length === 1) {
    return [
      {
        id: 'bucket-retire',
        holderLabelZh: `${lead.fullNameZh}（本人退休自主倉）`,
        holderLabelEn: `${lead.fullNameEn} Retirement Sleeve`,
        targetCurrency: 'HKD / USD',
        purposeZh: '鎖定保證＋非保證紅利作退休生活費',
        purposeEn: 'Retirement passive cashflow sleeve',
        allocationPct: 50,
      },
      {
        id: 'bucket-child1',
        holderLabelZh: `${children[0].nameZh}（子女升學置業倉）`,
        holderLabelEn: `${children[0].nameEn} Education & Housing`,
        targetCurrency: 'GBP / AUD / USD',
        purposeZh: '18歲轉外幣交學費，成家後轉受保人獨立持有',
        purposeEn: 'Switch currency at 18 for tuition & transfer ownership',
        allocationPct: 30,
      },
      {
        id: 'bucket-legacy',
        holderLabelZh: `${spouse ? spouse.nameZh : '家族傳承儲備'}（跨代傳承倉）`,
        holderLabelEn: 'Family Legacy Reserve Sleeve',
        targetCurrency: 'USD',
        purposeZh: '長線複利滾存並設後備受保人傳承孫輩',
        purposeEn: 'Long-term USD compounding for future grandchildren',
        allocationPct: 20,
      },
    ];
  }

  return [
    {
      id: 'bucket-retire',
      holderLabelZh: `${lead.fullNameZh}（退休長糧主倉）`,
      holderLabelEn: `${lead.fullNameEn} Retirement Income`,
      targetCurrency: 'HKD / USD',
      purposeZh: '自製終身退休現金流',
      purposeEn: 'Self-funded retirement cashflow',
      allocationPct: 50,
    },
    {
      id: 'bucket-global',
      holderLabelZh: '環球旅居外幣倉（子保單 A）',
      holderLabelEn: 'Global Relocation FX Sleeve',
      targetCurrency: 'GBP / CAD / AUD / RMB',
      purposeZh: '按旅居或大灣區養老需要靈活轉換貨幣',
      purposeEn: 'Multi-currency switch for overseas / GBA lifestyle',
      allocationPct: 25,
    },
    {
      id: 'bucket-legacy',
      holderLabelZh: '家人／後輩傳承倉（子保單 B）',
      holderLabelEn: 'Succession & Family Protection Sleeve',
      targetCurrency: 'USD',
      purposeZh: '無限次轉受保人及指定後備持有人免遺產承辦凍結',
      purposeEn: 'Probate-free family transfer via contingent owner',
      allocationPct: 25,
    },
  ];
}

export function simulateSavingsPolicySplitTimeline(params: {
  lead: ClientLead;
  allPlans: InsurancePlan[];
  preferredPlanId?: string;
  currency: CurrencyCode;
  annualPremiumInput: number;
  paymentTermYears: 5 | 10;
  chosenSplitYear: 5 | 8 | 10;
  buckets: FamilySplitBucketInput[];
  advisorNameZh?: string;
}): SavingsPolicySplitSimulationResult {
  const {
    lead,
    allPlans,
    preferredPlanId,
    currency,
    annualPremiumInput,
    paymentTermYears,
    chosenSplitYear,
    buckets,
    advisorNameZh = '您的保險顧問',
  } = params;

  const compatibleSavingsPlans = allPlans.filter(
    (p) =>
      p.category === PlanCategory.PARTICIPATING_SAVINGS ||
      p.category === PlanCategory.UNIVERSAL_LIFE
  );

  const selectedPlan =
    compatibleSavingsPlans.find((p) => p.id === preferredPlanId) ||
    compatibleSavingsPlans[0] ||
    allPlans[0];

  const planText = `${selectedPlan.nameZh} ${selectedPlan.nameEn} ${selectedPlan.keyHighlightsZh.join(' ')}`;
  const earliestSplitYearAllowed = /第3|year 3/i.test(planText) ? 3 : 5;
  const currencyMatch = planText.match(/(\d+)\s*種(環球|主流)?貨幣/);
  const supportedCurrencyCountLabelZh = currencyMatch
    ? `支援 ${currencyMatch[1]} 種貨幣自由轉換`
    : `支援 ${selectedPlan.currencies.join(' / ')} 多元貨幣配置`;

  // Calibrate sumAssured so annualPremium matches annualPremiumInput cleanly
  const safeAnnual = Math.max(10000, annualPremiumInput);
  const probeQuote = calculateCompliantQuote({
    plan: selectedPlan,
    age: lead.age,
    isSmoker: lead.isSmoker,
    currency,
    sumAssuredInSelectedCurrency: 100000,
    paymentTermYears,
  });
  const scaledSumAssured = Math.max(
    20000,
    Math.round((safeAnnual / Math.max(1, probeQuote.annualPremium)) * 100000)
  );

  const quote = calculateCompliantQuote({
    plan: selectedPlan,
    age: lead.age,
    isSmoker: lead.isSmoker,
    currency,
    sumAssuredInSelectedCurrency: scaledSumAssured,
    paymentTermYears,
  });

  // Normalize bucket percentages to sum to 100%
  const rawSum = buckets.reduce((acc, b) => acc + Math.max(0, b.allocationPct), 0) || 100;
  const normBuckets = buckets.map((b, idx) => ({
    ...b,
    allocationPct:
      idx === buckets.length - 1
        ? Math.max(
            0,
            100 -
              buckets
                .slice(0, -1)
                .reduce((s, x) => s + Math.round((Math.max(0, x.allocationPct) / rawSum) * 100), 0)
          )
        : Math.round((Math.max(0, b.allocationPct) / rawSum) * 100),
  }));

  const getProjAtYear = (yr: number): { total: number; guar: number } => {
    const exact = quote.projections.find((r) => r.policyYear === yr);
    if (exact) {
      return { total: exact.totalSurrenderValue, guar: exact.guaranteedCashValue };
    }
    // Interpolate / extrapolate for Year 8 or Year 40 using effectiveIllustratedIrrPercent
    const paidYrs = Math.min(yr, paymentTermYears);
    const paid = quote.annualPremium * paidYrs;
    const effIrr = quote.effectiveIllustratedIrrPercent / 100;
    const dur = Math.max(1, yr - paidYrs * 0.42);
    const total = Math.round(paid * Math.pow(1 + effIrr, dur * 0.82));
    const guar = Math.round(paid * Math.min(1.55, 0.8 + Math.max(0, yr - 6) * 0.018));
    return { total: Math.max(guar, total), guar };
  };

  const timelineYears: Array<{
    yr: number;
    titleZh: string;
    titleEn: string;
    badgeZh: string;
    descZh: string;
  }> = [
    {
      yr: chosenSplitYear,
      titleZh: `第 ${chosenSplitYear} 保單年度 · 啟動「保單分拆選項 (Policy Split)」`,
      titleEn: `Policy Year ${chosenSplitYear} · Execute Policy Split`,
      badgeZh: `1 拆 ${normBuckets.length} 份獨立保單`,
      descZh: `母保單無須退保重買，直接按 ${normBuckets.map((b) => `${b.allocationPct}%`).join(' / ')} 拆分為 ${normBuckets.length} 份獨立子保單，各自獨立滾存紅利。`,
    },
    {
      yr: 15,
      titleZh: '第 15 保單年度 · 子保單獨立轉換外幣 ＋ 鎖定紅利支援升學／置業',
      titleEn: 'Policy Year 15 · Independent Currency Switch & Dividend Lock-In',
      badgeZh: '多元貨幣轉換 ＋ 部份提取',
      descZh: '子女升學倉可單獨轉為英鎊／加元／澳元對沖匯率，本人退休倉繼續保留美元／港元複利滾存，互不影響。',
    },
    {
      yr: 20,
      titleZh: '第 20 保單年度 · 本人退休倉啟動被動現金流 ＋ 子保單轉受保人',
      titleEn: 'Policy Year 20 · Retirement Drawdown & 1st Change of Insured',
      badgeZh: '退休長糧 ＋ 轉受保人予子女',
      descZh: '本人子保單開始定期提取紅利作退休生活費；子女專屬保單更改受保人及後備持有人，資產正式交棒第二代。',
    },
    {
      yr: 30,
      titleZh: '第 30 保單年度 · 無限次更改受保人跨代傳承第三代孫輩',
      titleEn: 'Policy Year 30 · 2nd Change of Insured to Grandchildren',
      badgeZh: '三代富足傳承（免遺產承辦）',
      descZh: '透過無限次轉換受保人及後備保單持有人機制，保單年期延續至第三代孫輩，免除漫長遺產承辦程序。',
    },
  ];

  const milestones: PolicySplitMilestoneNode[] = timelineYears.map((node) => {
    const { total, guar } = getProjAtYear(node.yr);
    return {
      policyYear: node.yr,
      clientAge: lead.age + node.yr,
      titleZh: node.titleZh,
      titleEn: node.titleEn,
      actionBadgeZh: node.badgeZh,
      masterOrCombinedValue: total,
      guaranteedFloorValue: guar,
      bucketValues: normBuckets.map((b) => ({
        id: b.id,
        holderLabelZh: b.holderLabelZh,
        targetCurrency: b.targetCurrency,
        purposeZh: b.purposeZh,
        allocationPct: b.allocationPct,
        projectedValueInBaseCurrency: Math.round((total * b.allocationPct) / 100),
      })),
      descriptionZh: node.descZh,
    };
  });

  const yr20 = milestones.find((m) => m.policyYear === 20) || milestones[milestones.length - 1];
  const yr30 = milestones[milestones.length - 1];

  const whatsappLegacySummaryZh = `你好 ${lead.fullNameZh}！幫你用「[${selectedPlan.insurerNameZh}] ${selectedPlan.nameZh}」（${currency} ${quote.annualPremium.toLocaleString()} × ${paymentTermYears}年供款，總本金 ${currency} ${quote.totalPremiumsPaid.toLocaleString()}）畫好咗跨代保單分拆時間軸：\n• 第 ${chosenSplitYear} 年起一張保單免費「1 拆 ${normBuckets.length}」：\n${yr20.bucketValues
    .map(
      (b) =>
        `  - ${b.holderLabelZh}（${b.allocationPct}% · ${b.targetCurrency}）：第20年預計價值約 ${currency} ${b.projectedValueInBaseCurrency.toLocaleString()}`
    )
    .join('\n')}\n• 第 30 年總預期價值滾存至約 ${currency} ${yr30.masterOrCombinedValue.toLocaleString()}（嚴格遵守保監局 GL28 演示上限 ${quote.effectiveIllustratedIrrPercent.toFixed(2)}%），仲支援無限次轉受保人傳承畀下一代！— ${advisorNameZh}`;

  return {
    selectedPlan,
    compatibleSavingsPlans,
    earliestSplitYearAllowed,
    chosenSplitYear,
    currency,
    annualPremium: quote.annualPremium,
    paymentTermYears,
    totalPrincipalPaid: quote.totalPremiumsPaid,
    effectiveIllustratedIrrPct: quote.effectiveIllustratedIrrPercent,
    supportedCurrencyCountLabelZh,
    buckets: normBuckets,
    milestones,
    whatsappLegacySummaryZh,
  };
}

// ============================================================================
// TOOL 5: 入院／門診／危疾理賠文件一鍵 Checklist（配對全產品庫 ＋ 即時複製 WhatsApp）
// ============================================================================

export type ClaimChecklistScenarioId =
  | 'PRIVATE_INPATIENT_LOG'
  | 'DAY_CASE_ENDOSCOPY'
  | 'ACCIDENT_OUTPATIENT_PHYSIO'
  | 'CRITICAL_ILLNESS_LUMP_SUM';

export interface ClaimChecklistDocumentRow {
  id: string;
  group: 'CLIENT_DOCS' | 'DOCTOR_WORDING' | 'RECEIPT_PITFALLS';
  textZh: string;
  textEn: string;
  mandatory: boolean;
}

export interface PlanMatchedClaimsChecklistResult {
  scenarioId: ClaimChecklistScenarioId;
  scenarioTitleZh: string;
  scenarioTitleEn: string;
  plan: InsurancePlan;
  insurerChannelZh: string;
  insurerTurnaroundZh: string;
  planSpecificAlertZh: string;
  items: ClaimChecklistDocumentRow[];
  whatsappChecklistMessageZh: string;
}

const INSURER_CLAIM_PORTAL_MAP: Record<
  string,
  { channelZh: string; turnaroundZh: string }
> = {
  AIA: {
    channelZh: 'AIA+ 手機 App ／ 顧問 iService 免找數專線',
    turnaroundZh: '入院免找數預批：預約手術前 3–5 個工作天；門診電子索償：約 3–5 個工作天 FPS 入賬',
  },
  PRU: {
    channelZh: 'PRUmobile App ／ 保誠醫療網絡免找數中心',
    turnaroundZh: '入院免找數預批：手術前 3–5 個工作天；一般理賠：約 5 個工作天',
  },
  MANULIFE: {
    channelZh: 'Manulife HK App (claimSimple.hk) ／ 宏利免找數專線',
    turnaroundZh: '入院免找數預批：最少 3–5 個工作天；小額門診網上免寄正本快速批核',
  },
  FWD: {
    channelZh: 'FWD MAX App ／ 富衛 24 小時免找數支援專線',
    turnaroundZh: '入院免找數預批：最快 24–72 小時；簡易理賠最快秒級／數日 FPS 過數',
  },
  AXA: {
    channelZh: 'Emma by AXA App ／ 安盛特選醫療網絡直付',
    turnaroundZh: '入院免找數預批：手術前 3–5 個工作天；網絡門診支援電子醫療卡',
  },
  SUNLIFE: {
    channelZh: 'My Sun Life HK App ／ 永明私家醫院免找數預批部',
    turnaroundZh: '入院免找數預批：最少 4–5 個工作天；電子理賠直入指定銀行戶口',
  },
  BOCLIFE: {
    channelZh: '中銀人壽「大家減齡／電子服務平台」及大灣區綠通專線',
    turnaroundZh: '入院免找數預批：最少 5 個工作天；支援中銀香港戶口快速入賬',
  },
  BUPA: {
    channelZh: 'Blua Health App ／ 保柏醫療卡私院直付櫃位',
    turnaroundZh: '網絡私家醫院及日間中心支援即時／24–48 小時免找數直付',
  },
  CIGNA: {
    channelZh: 'MyCigna App ／ 信諾 24 小時臨床免找數專線',
    turnaroundZh: '入院免找數預批：最快 24–48 小時批出擔保信（LOG）',
  },
  BOWTIE: {
    channelZh: 'Bowtie 網上客戶平台 ／ 理賠專員 WhatsApp 免找數直線',
    turnaroundZh: '全程純網上免填紙本，私院入院前 3–5 個工作天批出 LOG',
  },
  CTFLIFE: {
    channelZh: '周大福人壽「客戶服務 App」及私家醫院免找數預批服務',
    turnaroundZh: '入院免找數預批：手術前 4–5 個工作天；理賠款項支援 FPS／自動轉賬',
  },
};

export function buildPlanMatchedClaimsChecklist(params: {
  scenarioId: ClaimChecklistScenarioId;
  plan: InsurancePlan;
  lead: ClientLead;
  advisorNameZh?: string;
  advisorPhone?: string;
}): PlanMatchedClaimsChecklistResult {
  const {
    scenarioId,
    plan,
    lead,
    advisorNameZh = '您的保險顧問',
    advisorPhone = '',
  } = params;

  const portal = INSURER_CLAIM_PORTAL_MAP[plan.insurerCode] || {
    channelZh: `${plan.insurerNameZh} 官方電子理賠平台 ／ 顧問代辦專線`,
    turnaroundZh: '私家醫院免找數預批建議最少提前 5 個工作天遞交；實報實銷出院後 30–90 日內遞交',
  };

  let scenarioTitleZh = '';
  let scenarioTitleEn = '';
  let planSpecificAlertZh = '';
  let items: ClaimChecklistDocumentRow[] = [];

  if (scenarioId === 'PRIVATE_INPATIENT_LOG') {
    scenarioTitleZh = '私家醫院入院「免找數預先批核 (Cashless LOG)」清單';
    scenarioTitleEn = 'Private Hospital Cashless LOG Pre-Approval Checklist';
    planSpecificAlertZh =
      plan.category === PlanCategory.VHIS && plan.nameZh.includes('標準')
        ? `注意：「${plan.nameZh}」屬 VHIS 標準計劃（普通房分項上限），入住私家醫院建議揀普通房（Standard Ward）以免觸發病房級別調整比例（Ward Adjustment Factor）或自付差額。`
        : `當前配對「[${plan.insurerNameZh}] ${plan.nameZh}」：請確認入住病房級別符合保單保障級別（如半私家房／私家房），獲批 LOG 後入院可減免高達 HK$30,000–$80,000 按金！`;
    items = [
      {
        id: 'log-1',
        group: 'CLIENT_DOCS',
        textZh: '填妥「入院免找數預先批核申請表（Part I 受保人部份）」及香港身份證副本',
        textEn: 'Completed Cashless LOG Pre-Authorization Form (Part I) & HKID copy',
        mandatory: true,
      },
      {
        id: 'log-2',
        group: 'CLIENT_DOCS',
        textZh: '私家醫院入院通知書／預約手術確認信（列明入院日期、醫院名稱及預計病房級別）',
        textEn: 'Hospital admission booking slip stating date, hospital & ward class',
        mandatory: true,
      },
      {
        id: 'log-3',
        group: 'DOCTOR_WORDING',
        textZh: '主診專科醫生填妥 Part II：必須寫明「病徵出現日期 (Onset Date)」、「臨床診斷」及「醫療必需入院原因 (Medical Necessity)」',
        textEn: 'Attending surgeon Part II stating symptom onset date, diagnosis & medical necessity',
        mandatory: true,
      },
      {
        id: 'log-4',
        group: 'DOCTOR_WORDING',
        textZh: '附上主診醫生收費報價（外科手術費、麻醉師費、巡房費預算）及相關超聲波／MRI／化驗報告',
        textEn: 'Surgeon & anesthetist fee quotation + pre-op imaging/lab reports',
        mandatory: true,
      },
      {
        id: 'log-5',
        group: 'RECEIPT_PITFALLS',
        textZh: '防伏提醒：切勿向醫生要求「順便入院做埋全身無症狀 Check-up」，非醫療必需之體檢項目保司不會批入 LOG！',
        textEn: 'Avoid bundling asymptomatic routine check-up items into inpatient admission',
        mandatory: true,
      },
    ];
  } else if (scenarioId === 'DAY_CASE_ENDOSCOPY') {
    scenarioTitleZh = '日間手術中心／醫院「腸胃鏡・微創小手術」理賠清單';
    scenarioTitleEn = 'Day-Case Endoscopy & Minor Surgery Claim Checklist';
    planSpecificAlertZh = `配對「[${plan.insurerNameZh}] ${plan.nameZh}」：香港保司極鼓勵於「日間手術中心 (Day Procedure Centre)」進行腸胃鏡／割粉瘤／白內障，免住院過夜同樣全額受保且免佔用住院按金！`;
    items = [
      {
        id: 'day-1',
        group: 'CLIENT_DOCS',
        textZh: '日間手術中心正式收據正本（Official Receipt）及逐項收費明細表（Itemized Bill）',
        textEn: 'Original official receipt & itemized statement from Day Surgery Centre',
        mandatory: true,
      },
      {
        id: 'day-2',
        group: 'DOCTOR_WORDING',
        textZh: '醫生理賠表格必須列明「臨床症狀（如持續胃痛、胃酸倒流、大便習慣改變或大便隱血）」，切忌只寫 Routine Screening！',
        textEn: 'Claim form must state clinical symptoms (e.g. epigastric pain / occult blood), not routine screening',
        mandatory: true,
      },
      {
        id: 'day-3',
        group: 'DOCTOR_WORDING',
        textZh: '內窺鏡檢查圖文報告（Endoscopy Report）及如有切除息肉／抽取組織之「病理化驗報告 (Pathology Report)」',
        textEn: 'Endoscopy report AND histopathology report (mandatory if polyp/biopsy taken)',
        mandatory: true,
      },
      {
        id: 'day-4',
        group: 'RECEIPT_PITFALLS',
        textZh: '若有公司團體醫保先賠：記得向團保公司索取「賠償結算通知書 (Claim Settlement Advice)」＋ 核證收據副本再交個人 VHIS 賠餘額！',
        textEn: 'If claiming Employer Group Medical first, obtain Settlement Advice + certified copy for VHIS second-payor claim',
        mandatory: false,
      },
    ];
  } else if (scenarioId === 'ACCIDENT_OUTPATIENT_PHYSIO') {
    scenarioTitleZh = '意外急症／門診／跌打／物理治療／MRI 索償清單';
    scenarioTitleEn = 'Accidental Outpatient, Physiotherapy & MRI Claim Checklist';
    planSpecificAlertZh = `配對「[${plan.insurerNameZh}] ${plan.nameZh}」：注意物理治療、脊椎治療及私家診斷成像（MRI／CT）必須持有「註冊西醫書面轉介信（Referral Letter）」且轉介日期須早於或同日於治療／掃描日期！`;
    items = [
      {
        id: 'acc-1',
        group: 'CLIENT_DOCS',
        textZh: '清晰記錄意外發生日期、時間、地點及受傷經過（如扭傷腳踝、運動碰撞、家居燙傷）',
        textEn: 'Exact date, time, location & mechanism of accidental external injury',
        mandatory: true,
      },
      {
        id: 'acc-2',
        group: 'DOCTOR_WORDING',
        textZh: '首次求診西醫收據正本（必須印有受保人全名、求診日期、清晰醫學診斷 Diagnosis 及醫生簽署印章）',
        textEn: 'First-consultation doctor receipt showing patient name, date, exact diagnosis & chop',
        mandatory: true,
      },
      {
        id: 'acc-3',
        group: 'DOCTOR_WORDING',
        textZh: '物理治療／MRI 必備：主診註冊西醫簽發之「轉介信副本（Referral Letter）」（切記先睇西醫攞轉介信先好去做物理治療！）',
        textEn: 'Registered Western doctor Referral Letter dated ON or BEFORE physiotherapy / MRI scan',
        mandatory: true,
      },
      {
        id: 'acc-4',
        group: 'RECEIPT_PITFALLS',
        textZh: '跌打／針灸中醫收據：必須為「香港註冊中醫（印有註冊編號 CMPxxxxxx）」，並列明診金與敷藥明細（補品藥材不保）',
        textEn: 'Registered Chinese Medicine Practitioner (with HK CMP reg no.) receipt excluding tonic herbs',
        mandatory: false,
      },
    ];
  } else {
    scenarioTitleZh = '嚴重／早期危疾確診「一筆過現金賠償」申請清單';
    scenarioTitleEn = 'Critical Illness / Early-Stage CI Lump-Sum Claim Checklist';
    planSpecificAlertZh = `配對「[${plan.insurerNameZh}] ${plan.nameZh}」（保單等候期條款：${plan.waitingPeriodText}）：危疾屬一筆過現金賠償，與實報實銷醫療保單互不衝突，兩邊可同時獨立索償！`;
    items = [
      {
        id: 'ci-1',
        group: 'CLIENT_DOCS',
        textZh: '危疾理賠申請書（Part I）及受保人身份證、收款香港銀行戶口／轉數快證明',
        textEn: 'Critical Illness Claim Form Part I, HKID & HK bank / FPS payout details',
        mandatory: true,
      },
      {
        id: 'ci-2',
        group: 'DOCTOR_WORDING',
        textZh: '主診專科醫生填妥「危疾理賠醫生報告 Part II」（如腫瘤科／心臟科／腦神經科專科醫生簽署）',
        textEn: 'Specialist Attending Physician Statement (Part II) signed by Oncologist/Cardiologist/Neurologist',
        mandatory: true,
      },
      {
        id: 'ci-3',
        group: 'DOCTOR_WORDING',
        textZh: '關鍵確診醫學證據正本／核證本：\n• 癌症／原位癌：組織病理學活檢報告（Histopathology Biopsy Report 列明 TNM 分期）\n• 心臟病／通波仔：心電圖、心肌酵素 Troponin 驗血及冠狀動脈造影／手術報告\n• 中風：腦部 MRI／CT 影像報告及持續神經功能缺損紀錄',
        textEn: 'Definitive diagnostic proof: Histopathology TNM biopsy (Cancer), Troponin + Angiogram (Cardiac), or Brain MRI/CT (Stroke)',
        mandatory: true,
      },
      {
        id: 'ci-4',
        group: 'RECEIPT_PITFALLS',
        textZh: '重要提醒：危疾索償「毋須交醫療收據正本」！醫療收據正本請留返交畀「自願醫保／高端醫保／公司團保」報銷手術費！',
        textEn: 'Keep original hospital receipts for Medical/VHIS reimbursement — CI lump-sum only needs pathology/clinical reports!',
        mandatory: true,
      },
    ];
  }

  const whatsappChecklistMessageZh = `你好 ${lead.fullNameZh}！為咗幫你順順利利跟進「[${plan.insurerNameZh}] ${plan.nameZh}」嘅【${scenarioTitleZh.replace('清單', '')}】，我幫你整理好必備文件 Checklist，你可以逐項對一對：\n\n📋 遞交渠道：${portal.channelZh}\n⏱ 預計批核：${portal.turnaroundZh}\n\n✅ 請準備以下文件：\n${items
    .map((it, idx) => `${idx + 1}. ${it.textZh}`)
    .join('\n')}\n\n💡 貼心提示：${planSpecificAlertZh}\n影好相或者有任何問題隨時 WhatsApp 發畀我，我即刻幫你對齊字眼同跟進批核！— ${advisorNameZh}${advisorPhone ? ` (${advisorPhone})` : ''}`;

  return {
    scenarioId,
    scenarioTitleZh,
    scenarioTitleEn,
    plan,
    insurerChannelZh: portal.channelZh,
    insurerTurnaroundZh: portal.turnaroundZh,
    planSpecificAlertZh,
    items,
    whatsappChecklistMessageZh,
  };
}

// ============================================================================
// TOOL 6: 多幣種交費與信用卡／eDDA 優惠比較小工具（配對全產品庫 ＋ 實時匯率 ＋ 保司回贈）
// ============================================================================

export type HkPaymentChannelId =
  | 'HK_BANK_EDDA'
  | 'FPS_INSTANT'
  | 'VISA_MASTER_LOCAL_CARD'
  | 'UNIONPAY_CARD'
  | 'CASHIER_ORDER_CHEQUE'
  | 'OFFSHORE_TT_WIRE';

export interface CurrencySettlementOptionRow {
  currency: CurrencyCode;
  supportedByPlan: boolean;
  annualPremiumNative: number;
  hkdEquivalentAtMidFx: number;
  insurerCounterFxSpreadHkd: number;
  gl28CapLabelZh: string;
  recommendationZh: string;
}

export interface PaymentChannelComparisonRow {
  channelId: HkPaymentChannelId;
  titleZh: string;
  titleEn: string;
  availableForClient: boolean;
  suitabilityBadgeZh: string;
  adminOrWireFeeHkd: number;
  fxSpreadCostHkd: number;
  cardOrBankPerkValueHkd: number;
  insurerFirstYearRebateHkd: number;
  prepaidGuaranteedInterestYear1Hkd: number;
  netFirstYearEffectiveOutlayHkd: number;
  totalNetBenefitVsStandardHkd: number;
  notesZh: string;
}

export interface MultiFxAndPaymentComparisonResult {
  plan: InsurancePlan;
  selectedCurrency: CurrencyCode;
  grossFirstYearPremiumHkd: number;
  insurerOfferHeadlineZh: string | null;
  insurerFirstYearRebatePct: number;
  prepaidInterestRatePct: number | null;
  includeFiveYearPrepay: boolean;
  currencyRows: CurrencySettlementOptionRow[];
  paymentChannels: PaymentChannelComparisonRow[];
  bestChannel: PaymentChannelComparisonRow;
  whatsappPaymentSummaryZh: string;
}

export function compareMultiCurrencyAndPaymentPerks(params: {
  plan: InsurancePlan;
  lead: ClientLead;
  selectedCurrency: CurrencyCode;
  annualPremiumHkdBasis: number;
  includeFiveYearPrepay: boolean;
  creditCardCashbackOrMilesPct?: number;
  fxFeed: FxRateFeedState;
  promoOverrides?: Record<string, PromoAdminOverride>;
  advisorNameZh?: string;
}): MultiFxAndPaymentComparisonResult {
  const {
    plan,
    lead,
    selectedCurrency,
    annualPremiumHkdBasis,
    includeFiveYearPrepay,
    creditCardCashbackOrMilesPct = 1.5,
    fxFeed,
    promoOverrides = {},
    advisorNameZh = '您的保險顧問',
  } = params;

  const grossHkd = Math.max(3000, Math.round(annualPremiumHkdBasis));
  const usdRate = fxFeed.usdToHkd || 7.8;
  const hkdToRmb = fxFeed.hkdToRmb || 0.923;

  // Resolve active seasonal insurer promo (respecting admin promoOverrides)
  const rawOffer = getSpecialOfferForPlan(plan);
  const override = promoOverrides[plan.insurerCode];
  const effectiveOffer =
    override?.archived
      ? null
      : rawOffer
      ? {
          ...rawOffer,
          firstYearRebatePct: override?.customRebatePct ?? rawOffer.firstYearRebatePct,
          prepaidGuaranteedRatePct:
            override?.customPrepaidRatePct !== undefined
              ? override.customPrepaidRatePct
              : rawOffer.prepaidGuaranteedRatePct,
        }
      : null;

  const insurerFirstYearRebatePct = effectiveOffer?.firstYearRebatePct ?? 0;
  const insurerFirstYearRebateHkd = Math.round((grossHkd * insurerFirstYearRebatePct) / 100);

  const canPrepay5Y =
    includeFiveYearPrepay &&
    Boolean(effectiveOffer?.prepaidGuaranteedRatePct) &&
    plan.supportedPaymentTerms.includes(5);
  const prepaidInterestRatePct = canPrepay5Y ? effectiveOffer!.prepaidGuaranteedRatePct! : null;
  // On 5Y lump-sum prepayment, Years 2–5 (4x annual premium) sit in the insurer prepaid interest account earning guaranteed p.a.
  const prepaidGuaranteedInterestYear1Hkd =
    canPrepay5Y && prepaidInterestRatePct
      ? Math.round(grossHkd * 4 * (prepaidInterestRatePct / 100))
      : 0;

  const isPar =
    plan.category === PlanCategory.PARTICIPATING_SAVINGS || plan.category === PlanCategory.QDAP;

  const allCurrs: CurrencyCode[] = ['USD', 'HKD', 'RMB'];
  const currencyRows: CurrencySettlementOptionRow[] = allCurrs.map((curr) => {
    const supported = plan.currencies.includes(curr);
    const nativeAmt =
      curr === 'HKD'
        ? grossHkd
        : curr === 'USD'
        ? Math.round(grossHkd / usdRate)
        : Math.round(grossHkd * hkdToRmb);
    const counterSpread =
      curr === 'HKD'
        ? 0
        : Math.round(grossHkd * (curr === 'USD' ? 0.0055 : 0.0068));

    return {
      currency: curr,
      supportedByPlan: supported,
      annualPremiumNative: nativeAmt,
      hkdEquivalentAtMidFx: grossHkd,
      insurerCounterFxSpreadHkd: counterSpread,
      gl28CapLabelZh: !isPar
        ? '純保障／實報實銷（不適用分紅上限）'
        : curr === 'HKD'
        ? '保監局 GL28 港元演示上限 6.00%'
        : '保監局 GL28 非港元演示上限 6.50%（+0.50% 長線空間）',
      recommendationZh: !supported
        ? '此計劃未支援此保單貨幣'
        : curr === 'USD'
        ? `直接以香港銀行美元戶口 eDDA 扣繳 USD ${nativeAmt.toLocaleString()} 可慳保司牌價匯差約 HK$${counterSpread.toLocaleString()}`
        : curr === 'RMB'
        ? `適合持有離岸人民幣或大灣區資金客戶，直接以人民幣結算免二次兌換`
        : '本地港元出糧及扣稅最直接，零匯兌步驟',
    };
  });

  const counterSpreadIfConvertedHkd =
    selectedCurrency === 'HKD' ? 0 : Math.round(grossHkd * 0.0055);
  const safeCardPerkPct = Math.max(0, Math.min(4, creditCardCashbackOrMilesPct));

  // HK insurers generally waive credit card admin fee up to HK$50,000–$100,000 for protection/medical first-year premium,
  // while large savings lump-sum over cap incurs ~1.8% admin surcharge if paid by Visa/Master
  const isProtectionOrMed =
    plan.category === PlanCategory.VHIS ||
    plan.category === PlanCategory.HIGH_END_MEDICAL ||
    plan.category === PlanCategory.CRITICAL_ILLNESS ||
    plan.category === PlanCategory.TERM_LIFE ||
    plan.category === PlanCategory.GENERAL_GI;

  const freeCardCapHkd = isProtectionOrMed ? 120000 : 50000;
  const excessCardAmt = Math.max(0, grossHkd - freeCardCapHkd);
  const visaMasterAdminFeeHkd = Math.round(excessCardAmt * 0.018);
  const cardRebateValueHkd = Math.min(
    4500,
    Math.round(Math.min(grossHkd, 250000) * (safeCardPerkPct / 100))
  );

  const rawChannels: Array<Omit<PaymentChannelComparisonRow, 'netFirstYearEffectiveOutlayHkd' | 'totalNetBenefitVsStandardHkd'>> = [
    {
      channelId: 'HK_BANK_EDDA',
      titleZh: '香港個人銀行戶口 eDDA 電子直接付款授權',
      titleEn: 'HK Bank eDDA Direct Debit (USD / HKD / RMB)',
      availableForClient: true,
      suitabilityBadgeZh:
        selectedCurrency !== 'HKD' || grossHkd >= 80000
          ? '大額外幣保單最慳匯差首選'
          : '首年＋續保自動扣賬零手續費',
      adminOrWireFeeHkd: 0,
      fxSpreadCostHkd: 0, // Direct USD/RMB debit from multi-currency bank account avoids insurer counter FX spread!
      cardOrBankPerkValueHkd: grossHkd >= 50000 ? 300 : 100, // Bank eDDA setup / auto-pay promo reward
      insurerFirstYearRebateHkd,
      prepaidGuaranteedInterestYear1Hkd,
      notesZh:
        '支援滙豐／中銀／渣打／恒生外幣戶口直接扣美元或港元，避開保司牌價匯差（~0.55%），續保永不逾期斷單！',
    },
    {
      channelId: 'VISA_MASTER_LOCAL_CARD',
      titleZh: `香港本地 Visa / Mastercard 信用卡（按 ${safeCardPerkPct.toFixed(1)}% 回贈／里數折算）`,
      titleEn: `HK Visa / Mastercard (${safeCardPerkPct.toFixed(1)}% Rebate / Miles)`,
      availableForClient: lead.residency === 'HK_RESIDENT',
      suitabilityBadgeZh:
        visaMasterAdminFeeHkd === 0
          ? '醫療／危疾／中額保單賺里數回贈首選'
          : '超出免手續費上限部份收 ~1.8% 行政費',
      adminOrWireFeeHkd: visaMasterAdminFeeHkd,
      fxSpreadCostHkd: counterSpreadIfConvertedHkd,
      cardOrBankPerkValueHkd: lead.residency === 'HK_RESIDENT' ? cardRebateValueHkd : 0,
      insurerFirstYearRebateHkd,
      prepaidGuaranteedInterestYear1Hkd,
      notesZh:
        visaMasterAdminFeeHkd === 0
          ? `保額於免行政費門檻內，零手續費兼賺約 HK$${cardRebateValueHkd.toLocaleString()} 信用卡現金回贈／飛行里數！`
          : `注意：儲蓄大額保費超出 HK$${freeCardCapHkd.toLocaleString()} 部份保司一般收取約 1.8% 刷卡行政費（HK$${visaMasterAdminFeeHkd.toLocaleString()}）。`,
    },
    {
      channelId: 'FPS_INSTANT',
      titleZh: '轉數快 FPS 即時掃碼繳費（HKD / RMB）',
      titleEn: 'Faster Payment System (FPS Instant QR)',
      availableForClient: true,
      suitabilityBadgeZh: '即時到賬 · 秒速批核出單',
      adminOrWireFeeHkd: 0,
      fxSpreadCostHkd: counterSpreadIfConvertedHkd,
      cardOrBankPerkValueHkd: 0,
      insurerFirstYearRebateHkd,
      prepaidGuaranteedInterestYear1Hkd,
      notesZh:
        '零手續費且 24 小時即時確認收妥首期保費；若繳交美元保單會按保司當日牌價由港元折算。',
    },
    {
      channelId: 'CASHIER_ORDER_CHEQUE',
      titleZh: '香港銀行美元／港元本票或支票（Cashier’s Order）',
      titleEn: 'HK Bank USD / HKD Cashier’s Order or Cheque',
      availableForClient: true,
      suitabilityBadgeZh: '5年預繳／百萬大額整付零上限',
      adminOrWireFeeHkd: 60, // Standard bank cashier order issuance fee (often waived for Premier/Private tiers)
      fxSpreadCostHkd: 0,
      cardOrBankPerkValueHkd: 0,
      insurerFirstYearRebateHkd,
      prepaidGuaranteedInterestYear1Hkd,
      notesZh:
        '不受每日 FPS／轉賬限額限制，直接開立美元本票存入保司專戶零匯差（卓越理財級別多可豁免 $60 本票費）。',
    },
    {
      channelId: 'UNIONPAY_CARD',
      titleZh: '銀聯卡／雲閃付香港保司繳費處刷卡',
      titleEn: 'UnionPay Card Onshore Counter Payment',
      availableForClient: true,
      suitabilityBadgeZh: lead.residency === 'MCV' ? 'MCV 訪港客戶常用首期渠道' : '支援銀聯渠道',
      adminOrWireFeeHkd: grossHkd > 100000 ? Math.round((grossHkd - 100000) * 0.012) : 0,
      fxSpreadCostHkd: Math.round(grossHkd * 0.0045),
      cardOrBankPerkValueHkd: 0,
      insurerFirstYearRebateHkd,
      prepaidGuaranteedInterestYear1Hkd,
      notesZh:
        '按銀聯當日實時匯率折算，保障型保單普遍免行政費；建議同時綁定香港個人銀行戶口 eDDA 作第 2 年起續期扣賬。',
    },
    {
      channelId: 'OFFSHORE_TT_WIRE',
      titleZh: '跨境電匯 TT 至保司香港銀行專戶',
      titleEn: 'Cross-Border Telegraphic Transfer (SWIFT TT)',
      availableForClient: true,
      suitabilityBadgeZh: '海外／離岸美元資金直匯',
      adminOrWireFeeHkd: 280,
      fxSpreadCostHkd: 0,
      cardOrBankPerkValueHkd: 0,
      insurerFirstYearRebateHkd,
      prepaidGuaranteedInterestYear1Hkd,
      notesZh:
        '匯款備註必須填寫保單申請編號（Policy / Application No.），並預留約 HK$250–$300 發匯及中轉行電匯費。',
    },
  ];

  const paymentChannels: PaymentChannelComparisonRow[] = rawChannels
    .map((c) => {
      const netFirstYearEffectiveOutlayHkd = Math.max(
        0,
        grossHkd +
          c.adminOrWireFeeHkd +
          c.fxSpreadCostHkd -
          c.cardOrBankPerkValueHkd -
          c.insurerFirstYearRebateHkd -
          c.prepaidGuaranteedInterestYear1Hkd
      );
      const totalNetBenefitVsStandardHkd = grossHkd - netFirstYearEffectiveOutlayHkd;
      return {
        ...c,
        netFirstYearEffectiveOutlayHkd,
        totalNetBenefitVsStandardHkd,
      };
    })
    .sort((a, b) => {
      if (a.availableForClient !== b.availableForClient) {
        return a.availableForClient ? -1 : 1;
      }
      return a.netFirstYearEffectiveOutlayHkd - b.netFirstYearEffectiveOutlayHkd;
    });

  const bestChannel = paymentChannels[0];

  const whatsappPaymentSummaryZh = `你好 ${lead.fullNameZh}！幫你計埋「[${plan.insurerNameZh}] ${plan.nameZh}」（首年應繳保費約 HK$${grossHkd.toLocaleString()} 等值 · 保單貨幣 ${selectedCurrency}）最抵嘅交費同換匯方法：\n${
    effectiveOffer
      ? `🎁 保司季度優惠：首年保費回贈 ${insurerFirstYearRebatePct}%（即減 HK$${insurerFirstYearRebateHkd.toLocaleString()}）${
          prepaidGuaranteedInterestYear1Hkd > 0
            ? ` ＋ 5年預繳首年保證利息約 HK$${prepaidGuaranteedInterestYear1Hkd.toLocaleString()}`
            : ''
        }\n`
      : ''
  }🏆 最推薦繳費方式：【${bestChannel.titleZh}】\n• 手續費／匯差成本：HK$${(bestChannel.adminOrWireFeeHkd + bestChannel.fxSpreadCostHkd).toLocaleString()}\n• 信用卡／銀行額外禮遇：約 HK$${bestChannel.cardOrBankPerkValueHkd.toLocaleString()}\n👉 扣除所有回贈後「首年實際淨支出」只需約：HK$${bestChannel.netFirstYearEffectiveOutlayHkd.toLocaleString()}（合共慳足 HK$${bestChannel.totalNetBenefitVsStandardHkd.toLocaleString()}）！— ${advisorNameZh}`;

  return {
    plan,
    selectedCurrency,
    grossFirstYearPremiumHkd: grossHkd,
    insurerOfferHeadlineZh: effectiveOffer?.headlineZh || null,
    insurerFirstYearRebatePct,
    prepaidInterestRatePct,
    includeFiveYearPrepay: canPrepay5Y,
    currencyRows,
    paymentChannels,
    bestChannel,
    whatsappPaymentSummaryZh,
  };
}

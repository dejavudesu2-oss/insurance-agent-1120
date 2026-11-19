import { PolicyProvisionChunk } from '../domain/types';

export const INITIAL_POLICY_PROVISIONS: PolicyProvisionChunk[] = [
  {
    id: 'chunk-aia-cis',
    planId: 'AIA_OYS2_CI',
    insurerName: 'AIA 友邦香港',
    planName: 'On Your Side Plan 2 愛伴航 2',
    clauseRef: 'Page 14, Clause 4.2 — Early Stage Critical Illness (Carcinoma-in-situ 原位癌)',
    topicTags: ['carcinoma', '原位癌', 'waiting period', '等候期', 'cancer', '癌症', 'early stage', 'critical illness'],
    contentEn:
      'Waiting Period: 90 days from Policy Issue Date or last reinstatement. Carcinoma-in-situ (CIS) Definition: Histologically confirmed focal autonomous new growth of carcinomatous cells confined to the cells in which it originated and has not resulted in invasion or destruction of surrounding tissues (TNM classification TisN0M0). Covered across all organs (excluding skin CIS). Advance Benefit: 20% of Current Sum Assured per claim, subject to a per-claim cap of USD 50,000 / HKD 400,000. Can be claimed up to 2 times on distinct covered organ groups.',
    contentZh:
      '等候期：由保單簽發日或最後復效日起計 90 日。原位癌（Carcinoma-in-situ）定義：經組織病理學活檢確診，癌細胞局限於發源之上皮細胞層內，並未穿透基底膜或侵入周圍組織（TNM分期為 TisN0M0）。保障涵蓋全身所有器官（皮膚原位癌除外）。預支賠償額：每次賠償當時投保額之 20%，每次上限 USD 50,000 / HKD 400,000，不同受保器官組別最多可索償 2 次。',
  },
  {
    id: 'chunk-manu-cis',
    planId: 'MANULIFE_MBC2',
    insurerName: 'Manulife 宏利香港',
    planName: 'ManuBright Care 2 活耀人生危疾保 2',
    clauseRef: 'Page 19, Section 3.1 — Early Stage Major Illness & Continuous Cancer Cash',
    topicTags: ['carcinoma', '原位癌', 'waiting period', '等候期', 'cancer', '癌症', 'dementia', '腦退化', 'critical illness'],
    contentEn:
      'Waiting Period: 90 days from Policy Issue Date. Carcinoma-in-situ Coverage: Covers histologically confirmed TisN0M0 lesions in specified organ groups (Breast, Cervix Uteri, Uterus, Ovary, Fallopian Tube, Colon/Rectum, Lung, Liver, Prostate, Nasopharynx, Urinary Bladder). Pays 20% of Sum Assured up to USD 50,000 / HKD 400,000 per claim (max 2 claims on distinct organs). Continuous Cancer Support: Following a Major Cancer claim (100% Sum Assured), if active treatment or palliative care continues 1 year after diagnosis, pays 5% of Sum Assured monthly up to 80 months (400% max).',
    contentZh:
      '等候期：保單簽發起計 90 日。原位癌保障：涵蓋指定器官組別（乳房、子宮頸、子宮、卵巢、輸卵管、大腸及直腸、肺、肝、前列腺、鼻咽、膀胱）經組織學確診之 TisN0M0 原位癌，每次預支保額 20%（上限 USD 50,000 / HKD 400,000，不同器官最多賠償 2 次）。持續癌症現金支援：嚴重癌症賠償（100%保額）滿 1 年後，如受保人仍接受積極治療，每月額外支付 5% 保額，長達 80 個月（合共高達 400%）。',
  },
  {
    id: 'chunk-pru-ci-stroke',
    planId: 'PRU_CIE3',
    insurerName: 'Prudential 保誠保險',
    planName: 'Crisis Cover Pro 3 危疾加護保 3',
    clauseRef: 'Page 22, Clause 5.4 — Multi-Claim Recurrence Waiting Interval & Stroke Definition',
    topicTags: ['stroke', '中風', 'heart attack', '心臟病', 'multi-claim', '多重賠償', 'waiting period', 'critical illness'],
    contentEn:
      'Waiting Period: 90 days from Policy Issue Date. Stroke Definition: Cerebrovascular incident producing neurological sequelae lasting more than 24 hours with MRI/CT evidence of infarction or hemorrhage (excludes TIA). Multi-Claim Waiting Interval: 1 year between two distinct Major Illness claims; 3 years between recurrent/persistent Cancer claims (shortened to 1 year if newly diagnosed primary cancer in an unrelated organ). Future premiums are 100% waived once cumulative payouts reach 100% of Initial Sum Assured.',
    contentZh:
      '等候期：保單簽發日起計 90 日。中風定義：腦血管事故引致神經系統後遺症持續超過 24 小時，並經磁力共振（MRI）或電腦掃描（CT）證實腦組織梗塞或出血（短暫性腦缺血 TIA 除外）。多重賠償等候間距：兩次不同嚴重疾病索償之間相隔 1 年；癌症持續或復發索償相隔 3 年（若屬全新獨立器官原發癌則縮短至 1 年）。累計賠償達投保額 100% 即永久豁免往後續期保費。',
  },
  {
    id: 'chunk-axa-ci-icu',
    planId: 'AXA_LOVEASSURE_PLUS_CI',
    insurerName: 'AXA 安盛香港',
    planName: 'LoveAssure Plus 愛唯守危疾保障（升級版）',
    clauseRef: 'Page 17, Clause 4.8 — Continuous Cancer Monthly Income & ICU Stay Benefit',
    topicTags: ['icu', '深切治療', 'cancer', '癌症', 'waiting period', '等候期', 'critical illness'],
    contentEn:
      'Waiting Period: 90 days general waiting period. Zero-Gap Late-Stage Cancer: If subsequent cancer is Stage III or IV metastasis, the 3-year cancer waiting interval may be waived after 1 year subject to active oncology therapy proof. ICU Protection: Continuous Intensive Care Unit stay of 72 hours or more with invasive mechanical ventilation or life-support pays 20% Advance Benefit; 120 hours or more with complex surgery pays up to 100% Major Benefit even if illness is unlisted.',
    contentZh:
      '等候期：一般疾病等候期為 90 日。指定晚期癌症零空窗：若後續確診第三或第四期轉移性癌症並持續接受腫瘤科治療滿1年，可豁免餘下癌症等候期。深切治療（ICU）保障：連續入住深切治療部達 72 小時或以上並接受侵入性維生支援，可預支 20% 保額；連續入住達 120 小時並進行複雜手術，即使病因未列入受保疾病表亦可獲高達 100% 嚴重賠償。',
  },
  {
    id: 'chunk-fwd-par',
    planId: 'FWD_MAXFOCUS_SIG',
    insurerName: 'FWD 富衛香港',
    planName: 'MaxFocus Signature Savings 盈聚天下壽險計劃',
    clauseRef: 'Page 8, Clause 6.1 & 9.4 — Currency Switch, Policy Split & Dividend Philosophy',
    topicTags: ['currency', '貨幣轉換', 'split', '保單分拆', 'dividend', '紅利', 'irr', 'guaranteed', 'savings'],
    contentEn:
      'Currency Option (Clause 6.1): Within 30 days after the 3rd Policy Anniversary and each subsequent anniversary, the Policy Owner may switch the policy currency among USD, HKD, RMB, GBP, CAD, AUD, SGD, and EUR without underwriting; Guaranteed Cash Value and Reversionary/Special Bonus adjust proportionally at prevailing FX without triggering policy termination. Policy Split (Clause 9.4): From Policy Year 5 onwards, owner may split the policy into 2 or more separate policies once per policy year. Non-guaranteed Special Bonus is subject to investment performance and HKIA illustration rate caps (max 6.0% HKD / 6.5% Non-HKD).',
    contentZh:
      '貨幣轉換權益（第6.1條）：由第3個保單週年日起，保單持有人可於每年週年日後30日內申請轉換至美元、港元、人民幣、英鎊、加元、澳元、新加坡元或歐元，毋須重新核保。保單分拆權益（第9.4條）：由第5個保單年度起，每年可申請將保單分拆為兩份或以上獨立保單。非保證特別紅利受投資表現影響，利益說明文件嚴格遵守香港保監局演示利率上限（港元保單上限 6.0% / 非港元保單上限 6.5%）。',
  },
  {
    id: 'chunk-aia-gpmcp3',
    planId: 'AIA_GPMCP3',
    insurerName: 'AIA 友邦香港',
    planName: 'Global Power Multi-Currency Plan 3 盈御多元貨幣計劃 3',
    clauseRef: 'Page 10, Clause 7.2 & 11.1 — Bonus Unlock Option & Mental Incapacity Guardian',
    topicTags: ['currency', '貨幣轉換', 'lock-in', '紅利解鎖', 'mental incapacity', '精神上無行為能力', 'savings'],
    contentEn:
      'Currency Conversion (Clause 7.2): From the 3rd Policy Anniversary, owner may convert policy currency among 9 currencies (RMB, USD, AUD, CAD, GBP, HKD, MOP, EUR, SGD) within 30 days after each anniversary. Bonus Unlock Option (Clause 9.3): From Policy Year 15, owner may unlock 10% to 50% of latest Reversionary Bonus & Terminal Dividend Cash Value once per policy year without reducing Guaranteed Cash Value proportionally beyond the unlocked ratio. Mental Incapacity Option (Clause 11.1): Pre-designated family recipient can withdraw up to designated % of policy value upon medical certification of dementia/coma without Court Committee order.',
    contentZh:
      '貨幣轉換（第7.2條）：第3個保單週年日起每年週年日後30日內可轉換9種貨幣。紅利解鎖選項（第9.3條）：第15個保單年度起每年可申請解鎖 10% 至 50% 復歸紅利及終期分紅現金價值。精神上無行為能力預設領取人（第11.1條）：倘保單持有人確診腦退化症或昏迷，預先指定之家屬毋須向高等法院申請監護令，即可直接提取指定比例保單現金價值應付醫療生活開支。',
  },
  {
    id: 'chunk-sunlife-par',
    planId: 'SUNLIFE_SUNJOY',
    insurerName: 'Sun Life 永明金融',
    planName: 'SunJoy Global Savings II 萬年青星河尊享計劃 II',
    clauseRef: 'Page 12, Clause 7.3 — Terminal Bonus Lock-In & Contingent Owner',
    topicTags: ['dividend', '紅利', 'lock-in', '鎖定紅利', 'savings', 'irr', 'contingent'],
    contentEn:
      'Terminal Bonus Lock-In (Clause 7.3): Starting from the 15th Policy Anniversary, the Policy Owner may lock in up to 50% of the non-guaranteed Terminal Bonus into a Guaranteed Interest Account accumulating interest at the prevailing non-guaranteed deposit rate, shielding gains from equity market drawdowns. Contingent Policy Owner & Twin Insured options allow seamless transfer upon death or mental incapacity without probate freeze.',
    contentZh:
      '終期紅利鎖定選項（第7.3條）：由第15個保單週年日起，保單持有人可申請將高達 50% 之非保證終期紅利鎖定並轉撥至積存生息帳戶，免受日後市場波動影響。配備後備保單持有人及雙受保人傳承安排，毋須經過遺產承辦凍結程序即可延續保單。',
  },
  {
    id: 'chunk-pru-vhis',
    planId: 'PRU_VHIS_VIP',
    insurerName: 'Prudential 保誠保險',
    planName: 'PRUHealth VHIS VIP 保誠自願醫保尚賓計劃',
    clauseRef: 'Page 11, Part 4 & Schedule of Benefits — Unknown Pre-existing Conditions & Full Cover',
    topicTags: ['vhis', '自願醫保', 'pre-existing', '投保前未知已有病症', 'waiting period', '等候期', 'cancer', 'tax'],
    contentEn:
      'Unknown Pre-existing Conditions (VHIS Standard Provision Part 4): Conditions unknown at application are covered on a sliding scale: Policy Year 1 = 0%, Policy Year 2 = 25%, Policy Year 3 = 50%, Policy Year 4 onwards = 100% full reimbursement. Prescribed Non-Surgical Cancer Treatments (radiotherapy, chemotherapy, targeted therapy, immunotherapy, hormonal therapy) and Prescribed Diagnostic Imaging (CT, MRI, PET scans, subject to 30% coinsurance only on outpatient imaging if applicable; inpatient 100% covered) are reimbursed in full up to Annual Benefit Limit HKD 12,000,000.',
    contentZh:
      '投保前未知的已有病症（自願醫保標準條款第4部份）：投保時合理地未察覺之已有病症按比例賠償：第1個保單年度 0%、第2年 25%、第3年 50%、第4年及以後 100% 全數賠償。訂明非手術癌症治療（電療、化療、標靶治療、免疫治療及荷爾蒙治療）享有全數賠償，年度保障限額高達 HKD 12,000,000，並無終身保障上限。',
  },
  {
    id: 'chunk-bowtie-vhis',
    planId: 'BOWTIE_PINK_VHIS',
    insurerName: 'Bowtie 保泰人壽',
    planName: 'Bowtie Pink VHIS 保泰自願醫保粉紅計劃',
    clauseRef: 'Page 7, Benefit Schedule Sec B — Deductible Mechanics & Day-31 Pre-Existing',
    topicTags: ['vhis', '自願醫保', 'deductible', '自付費', 'pre-existing', '投保前未知已有病症', 'waiting period'],
    contentEn:
      'Annual Deductible Mechanics: Selected annual deductible (HKD 0 / HKD 20,000 / HKD 50,000) resets each policy year and can be offset dollar-for-dollar by payouts from an employer group medical policy. Unknown Pre-existing Conditions: Faster VHIS enhancement—100% covered from Day 31 of Policy Year 1 for Bowtie Pink (exceeding VHIS standard 3-year scale), provided condition was genuinely unknown and undisclosed symptoms did not exist within 5 years prior to application. Psychiatric inpatient treatment in HK covered up to HKD 30,000 per policy year.',
    contentZh:
      '年度自付費機制：自選年度自付費（HKD 0 / 20,000 / 50,000）每年重新計算，並可由公司團體醫療保險賠償額直接抵銷。投保前未知已有病症：優於標準自願醫保條款，保單生效滿 30 日後即獲 100% 保障（惟投保前5年內不得有相關徵狀或求診紀錄）。香港境內精神科住院治療每年保障額高達 HKD 30,000。',
  },
  {
    id: 'chunk-axa-vhis-medical-necessity',
    planId: 'AXA_WISEGUARD_PRO_VHIS',
    insurerName: 'AXA 安盛香港',
    planName: 'WiseGuard Pro VHIS 智尊守慧醫療保障（自願醫保）',
    clauseRef: 'Page 9, Part 2 Clause 1.8 — "Medically Necessary" Day-Case vs. Inpatient Endoscopy',
    topicTags: ['vhis', '自願醫保', 'medical necessity', '醫療必需', 'endoscopy', '腸胃鏡', 'day-case', '日間手術', 'ward'],
    contentEn:
      'Medically Necessary Definition (Part 2 Clause 1.8): Hospital inpatient confinement for minor diagnostic procedures (e.g., colonoscopy, gastroscopy, cataract surgery, skin lesion excision) is covered on an inpatient basis ONLY when the Registered Medical Practitioner certifies specific clinical risk factors (cardiopulmonary instability, severe anesthesia risk, frailty age >70, or post-polypectomy bleeding observation). Otherwise, performing routine endoscopy at a designated Day-Case Surgical Centre enjoys 100% Cashless LOG settlement without inpatient ward rejection.',
    contentZh:
      '「醫療必需」審批準則（第2部份第1.8條）：小型診斷或日間程序（如大腸鏡、胃鏡、白內障、皮膚腫塊切除）如選擇入住私家醫院病房過夜，主診醫生必須於入院前證明具特定臨床醫療風險（如心肺功能風險、嚴重麻醉過敏、高齡體弱或大型息肉切除後出血觀察）；否則建議於指定網絡日間手術中心進行，可獲 100% 免找數預先批核，避免住院必要性爭議。',
  },
  {
    id: 'chunk-bupa-hero-ward-adj',
    planId: 'BUPA_MYFLEXI_VHIS_PLUS',
    insurerName: 'Bupa 保柏香港',
    planName: 'Bupa Hero / MyFlexi VHIS 保柏自願醫保系列',
    clauseRef: 'Page 15, Supplement Clause 3.2 — Voluntary Ward Upgrade Adjustment Factor',
    topicTags: ['vhis', 'ward upgrade', '病房升級', 'adjustment factor', '賠付折算因子', 'private room', '私家房'],
    contentEn:
      'Voluntary Ward Class Upgrade (Clause 3.2): If an Insured covered under a Semi-Private Ward plan voluntarily stays in a Standard Private Room (without hospital bed shortage proof), eligible Hospital & Surgical charges are reimbursed at the Ward Adjustment Factor of 50% (25% if upgrading to VIP Deluxe Suite). Obtaining written confirmation from the hospital that Semi-Private beds were 100% full at emergency admission waives the 50% penalty.',
    contentZh:
      '自願提升病房級別折算條款（第3.2條）：倘受保人投保「半私家房」計劃但自願入住「標準私家房」，所有合資格住院及外科醫生費用將按 50% 病房調整因子折算賠償（入住豪華貴賓套房則按 25% 折算）。如屬急症入院且院方書面證明當時半私家房全數爆滿而被迫升等，則可豁免折算扣減。',
  },
  {
    id: 'chunk-axa-qdap',
    planId: 'AXA_INCOME_QDAP',
    insurerName: 'AXA 安盛香港',
    planName: 'IncomeEnrich Deferred Annuity 享逸合資格延期年金',
    clauseRef: 'Page 6, Clause 5.1 — QDAP Tax Qualification & Monthly Annuity Stream',
    topicTags: ['qdap', '年金', 'tax', '扣稅', 'retirement', '退休'],
    contentEn:
      'HKIA QDAP Certification (Clause 5.1): Certified by the Insurance Authority under Inland Revenue Ordinance requirements. Qualifying annuity premiums paid by a HK taxpayer (for self or spouse) are deductible up to HKD 60,000 aggregate per assessment year (shared with MPF TVC). Minimum accumulation period is 5 years; annuity payout period is 10 or 20 years starting no earlier than age 50. Guaranteed Monthly Annuity Payment constitutes at least 65% of total projected monthly payout.',
    contentZh:
      '保監局合資格延期年金認證（第5.1條）：符合《稅務條例》扣稅資格，納稅人為本人或配偶繳付之合資格年金保費（與強積金可扣稅自願性供款合併計算）每個課稅年度最高可扣減 HKD 60,000。最短累積期為5年，年金期為10年或20年（最早50歲開始派發），保證每月年金款項佔預計總派發額最少 65%。',
  },
  {
    id: 'chunk-hkmc-annuity',
    planId: 'HKMC_LIFE_ANNUITY',
    insurerName: 'HKMC 香港年金公司',
    planName: 'HKMC Life Annuity Plan 香港年金計劃',
    clauseRef: 'Page 4, Clause 2.1 & 6.3 — 100% Guaranteed Lifetime Payout & Special Medical Withdrawal',
    topicTags: ['annuity', '年金', 'guaranteed', '保證', 'retirement', '退休', 'hkmc'],
    contentEn:
      'Lifetime Guaranteed Monthly Payout (Clause 2.1): Commencing one month after single premium payment, HKMC Annuity Limited pays a fixed, 100% guaranteed monthly HKD annuity for the entire lifetime of the Annuitant (e.g., age 65 male ~HK$5,800/month per HK$1M premium; female ~HK$5,300/month). Guaranteed Period (Clause 4.1): Guarantees cumulative payouts equal to 105% of Single Premium Paid; remaining balance passes to beneficiary upon earlier death. Special Withdrawal (Clause 6.3): Up to 50% of remaining premium (capped at HK$300,000) withdrawable without surrender discount for specified HK medical/dental expenses.',
    contentZh:
      '終身100%保證每月年金（第2.1條）：整付保費後翌月起，按月向受保人派發固定保證港元入息直至終身（例如65歲男性每100萬保費每月保證領取約 HK$5,800；女性約 HK$5,300）。105%保證期（第4.1條）：保證期內倘受保人身故，指定受益人可繼續領取或一筆過折現領取未派足 105% 已繳保費之餘額。特別款項提取（第6.3條）：支付香港境內合資格醫療或牙科開支可免折讓提取高達已繳保費50%（上限 HK$300,000）。',
  },
  {
    id: 'chunk-aia-ul-financing',
    planId: 'AIA_PLATINUM_UL',
    insurerName: 'AIA 友邦香港',
    planName: 'Platinum Wealth Universal Life 財富尊享萬用壽險',
    clauseRef: 'Page 13, Clause 8.2 & IFS-PF Annex — Guaranteed Minimum Crediting Floor & Surrender Charge',
    topicTags: ['universal life', '萬用壽險', 'premium financing', '保費融資', 'crediting rate', '派息率', 'guaranteed'],
    contentEn:
      'Crediting Interest Rate & Floor (Clause 8.2): Account Value earns the prevailing USD Crediting Rate declared monthly by the Company, subject to a Contractual Lifetime Minimum Guaranteed Crediting Rate of 2.00% p.a. from Policy Year 1 onwards. Surrender Charge Schedule (Clause 10.1): Decreasing surrender charge applies during Policy Years 1 to 10 (Year 1: 18% of Target Account Value; Year 11+: 0%). Collateral Assignment (IFS-PF Annex): When assigned to a private bank for premium financing, HIBOR/SOFR rate rises above policy crediting rate can trigger bank margin call or interest top-up.',
    contentZh:
      '派息率及最低保證下限（第8.2條）：保單賬戶價值按本公司每月公佈之現行美元派息率積存生息，並由第1個保單年度起享有每年最低 2.00% 合約保證派息率下限。退保費用表（第10.1條）：首10個保單年度設遞減式退保費用，第11年起退保費用為 0%。私人銀行抵押轉讓風險提示（保費融資附件）：倘銀行 HIBOR／SOFR 貸款利率上升並高於保單實際派息率（負利差），銀行有權要求補倉（Margin Call）或補繳利息差額。',
  },
  {
    id: 'chunk-zurich-term',
    planId: 'ZURICH_BREEZE_TERM',
    insurerName: 'Zurich 蘇黎世人壽',
    planName: 'Breeze Term Life Protector 瑞意定期壽險',
    clauseRef: 'Page 5, Clause 3.2 & 8.1 — Terminal Illness Advance & Conversion Right',
    topicTags: ['term', '定期壽險', 'conversion', 'suicide', '自殺', 'death'],
    contentEn:
      'Suicide Exclusion (Clause 3.2): If the Life Insured commits suicide, whether sane or insane, within 1 year from the Policy Issue Date, liability is limited to refund of premiums paid without interest. Conversion Privilege (Clause 8.1): Prior to age 70 and at least 2 years before expiry of the current level term, the owner may convert up to 100% of the Sum Assured to an eligible permanent whole life or endowment policy without further medical underwriting.',
    contentZh:
      '自殺不保條款（第3.2條）：倘受保人於保單簽發日起計 1 年內自殺（不論神智清醒與否），本公司僅退還已繳保費總額（不計利息）。免核保轉換權益（第8.1條）：於受保人年滿70歲前及現有保障期屆滿最少2年前，可將高達 100% 投保額轉換為指定終身壽險或儲蓄壽險計劃而毋須提供健康證明。',
  },
  {
    id: 'chunk-yflife-annuity-option',
    planId: 'YFLIFE_INFINITY_SAVER_3',
    insurerName: 'YF Life 萬通保險',
    planName: 'Infinity Saver 3 富饒世代儲蓄計劃 3',
    clauseRef: 'Page 16, Clause 10.2 — Contractual 11-Mode Lifetime Annuity Conversion Privilege',
    topicTags: ['annuity', '真年金', 'savings', '儲蓄', 'retirement', '退休', 'conversion'],
    contentEn:
      'Annuity Conversion Privilege (Clause 10.2): From age 55 and Policy Anniversary 10, the Policy Owner may exercise the Contractual Annuity Option to convert part or 100% of Total Cash Value into 1 of 11 guaranteed lifetime annuity payout options (including Joint-Life Survivor 100%/67%, 10-Year Certain & Life, or Increasing 3% p.a. Inflation-Linked Lifetime Annuity) at guaranteed minimum annuity conversion rates locked into the contract.',
    contentZh:
      '合約終身年金轉換權益（第10.2條）：受保人年滿55歲及保單生效滿10年後，保單持有人可行使「真年金轉換權益」，按合約鎖定之最低保證年金轉化率，將部份或全部保單現金價值轉換為 11 款終身年金模式之一（包括夫婦聯名終身領取、保證10年連終身、或每年遞增3%抗通脹終身年金）。',
  },
];

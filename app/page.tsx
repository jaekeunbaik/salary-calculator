'use client';

import React, { useState, useMemo } from 'react';

// ─── 유틸: 숫자 콤마 포맷터 ───
const formatWon = (num: number) => {
  return Math.round(num).toLocaleString('ko-KR') + '원';
};

const parseNumber = (val: string) => {
  const cleaned = val.replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
};

export default function SalaryCalculatorPage() {
  // ── 탭 상태 ──
  const [activeTab, setActiveTab] = useState<'salary' | 'hourly'>('salary');

  // ══════════════════════════════════════════════════════════════
  // 1. [연봉/월급 모드] 상태값
  // ══════════════════════════════════════════════════════════════
  const [salaryType, setSalaryType] = useState<'annual' | 'monthly'>('annual');
  const [salaryInput, setSalaryInput] = useState<string>('40,000,000'); // 기본값 4,000만원
  const [nonTaxableInput, setNonTaxableInput] = useState<string>('200,000'); // 기본 식대 20만원
  const [familyCount, setFamilyCount] = useState<number>(1); // 본인 포함 부양가족 수
  const [childrenCount, setChildrenCount] = useState<number>(0); // 8~20세 자녀 수

  // ══════════════════════════════════════════════════════════════
  // 2. [시급/주휴수당 모드] 상태값
  // ══════════════════════════════════════════════════════════════
  const [hourlyWageInput, setHourlyWageInput] = useState<string>('10,030'); // 2026년 최저시급 기준
  const [weeklyHoursInput, setWeeklyHoursInput] = useState<string>('20');
  const [workDaysPerWeek, setWorkDaysPerWeek] = useState<number>(5);
  const [applyInsurance, setApplyInsurance] = useState<boolean>(false); // 4대보험(9.4% 근사) 공제 여부
  const [applyTax, setApplyTax] = useState<boolean>(false); // 3.3% 사업소득세 공제 여부

  // ── 복사 완료 토스트 상태 ──
  const [copied, setCopied] = useState<boolean>(false);

  // ══════════════════════════════════════════════════════════════
  // 3. 연봉/월급 실수령액 계산 로직 (2026년 4대보험 및 간이세액)
  // ══════════════════════════════════════════════════════════════
  const salaryResult = useMemo(() => {
    const rawSalary = parseNumber(salaryInput);
    const nonTaxable = parseNumber(nonTaxableInput);

    // 월 세전 급여 계산
    const monthlyGross = salaryType === 'annual' ? rawSalary / 12 : rawSalary;
    if (monthlyGross <= 0) {
      return {
        monthlyGross: 0,
        annualGross: 0,
        taxableMonthly: 0,
        nationalPension: 0,
        healthInsurance: 0,
        longTermCare: 0,
        employmentInsurance: 0,
        totalInsurance: 0,
        incomeTax: 0,
        localIncomeTax: 0,
        totalTax: 0,
        totalDeduction: 0,
        monthlyNet: 0,
        annualNet: 0,
      };
    }

    const annualGross = salaryType === 'annual' ? rawSalary : rawSalary * 12;
    const taxableMonthly = Math.max(0, monthlyGross - nonTaxable);

    // 1) 국민연금: 4.5% (2026 기준 월 상한액 6,170,000원, 하한액 390,000원 적용)
    const pensionBase = Math.min(Math.max(taxableMonthly, 390000), 6170000);
    const nationalPension = Math.floor((pensionBase * 0.045) / 10) * 10;

    // 2) 건강보험: 3.545%
    const healthInsurance = Math.floor((taxableMonthly * 0.03545) / 10) * 10;

    // 3) 장기요양보험: 건강보험료의 12.95%
    const longTermCare = Math.floor((healthInsurance * 0.1295) / 10) * 10;

    // 4) 고용보험: 0.9%
    const employmentInsurance = Math.floor((taxableMonthly * 0.009) / 10) * 10;

    const totalInsurance = nationalPension + healthInsurance + longTermCare + employmentInsurance;

    // 5) 근로소득세 추정 (국세청 근로소득 간이세액표 누진세율 및 부양가족 공제 모델)
    const annualTaxable = taxableMonthly * 12;
    // 근로소득공제 추정
    let earnedIncomeDeduction = 0;
    if (annualTaxable <= 5000000) earnedIncomeDeduction = annualTaxable * 0.7;
    else if (annualTaxable <= 15000000) earnedIncomeDeduction = 3500000 + (annualTaxable - 5000000) * 0.4;
    else if (annualTaxable <= 45000000) earnedIncomeDeduction = 7500000 + (annualTaxable - 15000000) * 0.15;
    else if (annualTaxable <= 100000000) earnedIncomeDeduction = 12000000 + (annualTaxable - 45000000) * 0.05;
    else earnedIncomeDeduction = 14750000 + (annualTaxable - 100000000) * 0.02;

    const basicTaxBase = Math.max(0, annualTaxable - earnedIncomeDeduction);
    // 인적공제 (1인당 150만원)
    const personalDeduction = familyCount * 1500000;
    // 연금보험료 공제 및 표준 특별소득공제/세액공제 추정
    const otherDeductions = nationalPension * 12 + 2500000 + (childrenCount > 0 ? childrenCount * 150000 : 0);
    const taxBase = Math.max(0, basicTaxBase - personalDeduction - otherDeductions);

    // 소득세율 구간 (2026년 기준)
    let calculatedAnnualTax = 0;
    if (taxBase <= 14000000) calculatedAnnualTax = taxBase * 0.06;
    else if (taxBase <= 50000000) calculatedAnnualTax = 840000 + (taxBase - 14000000) * 0.15;
    else if (taxBase <= 88000000) calculatedAnnualTax = 6240000 + (taxBase - 50000000) * 0.24;
    else if (taxBase <= 150000000) calculatedAnnualTax = 15360000 + (taxBase - 88000000) * 0.35;
    else if (taxBase <= 300000000) calculatedAnnualTax = 37060000 + (taxBase - 150000000) * 0.38;
    else if (taxBase <= 500000000) calculatedAnnualTax = 94060000 + (taxBase - 300000000) * 0.40;
    else calculatedAnnualTax = 174060000 + (taxBase - 500000000) * 0.42;

    // 근로소득세액공제 추정
    let taxCredit = 0;
    if (calculatedAnnualTax <= 1300000) taxCredit = calculatedAnnualTax * 0.55;
    else taxCredit = 715000 + (calculatedAnnualTax - 1300000) * 0.3;
    taxCredit = Math.min(taxCredit, annualTaxable > 70000000 ? 500000 : 740000);

    const finalAnnualIncomeTax = Math.max(0, calculatedAnnualTax - taxCredit);
    const incomeTax = Math.floor((finalAnnualIncomeTax / 12) / 10) * 10;
    const localIncomeTax = Math.floor((incomeTax * 0.1) / 10) * 10;
    const totalTax = incomeTax + localIncomeTax;

    const totalDeduction = totalInsurance + totalTax;
    const monthlyNet = Math.max(0, monthlyGross - totalDeduction);
    const annualNet = monthlyNet * 12;

    return {
      monthlyGross,
      annualGross,
      taxableMonthly,
      nationalPension,
      healthInsurance,
      longTermCare,
      employmentInsurance,
      totalInsurance,
      incomeTax,
      localIncomeTax,
      totalTax,
      totalDeduction,
      monthlyNet,
      annualNet,
    };
  }, [salaryType, salaryInput, nonTaxableInput, familyCount, childrenCount]);

  // ══════════════════════════════════════════════════════════════
  // 4. 알바 시급/주휴수당 계산 로직
  // ══════════════════════════════════════════════════════════════
  const hourlyResult = useMemo(() => {
    const hourlyWage = parseNumber(hourlyWageInput);
    const weeklyHours = parseFloat(weeklyHoursInput) || 0;

    if (hourlyWage <= 0 || weeklyHours <= 0) {
      return {
        hourlyWage: 0,
        weeklyHours: 0,
        isHolidayPayEligible: false,
        holidayHours: 0,
        holidayPay: 0,
        basicWeeklyPay: 0,
        totalWeeklyGross: 0,
        totalMonthlyGross: 0,
        deductionAmount: 0,
        finalWeeklyNet: 0,
        finalMonthlyNet: 0,
      };
    }

    // 주 15시간 이상 근로 시 주휴수당 발생
    const isHolidayPayEligible = weeklyHours >= 15;

    // 주휴시간 계산: 주 40시간 이상이면 최대 8시간, 미만이면 (주 근로시간 / 40) * 8
    const holidayHours = isHolidayPayEligible
      ? weeklyHours >= 40
        ? 8
        : (weeklyHours / 40) * 8
      : 0;

    const basicWeeklyPay = hourlyWage * weeklyHours;
    const holidayPay = hourlyWage * holidayHours;
    const totalWeeklyGross = basicWeeklyPay + holidayPay;

    // 월 환산 (1달 = 평균 4.34524주, 즉 365일 / 7일 / 12개월)
    const avgWeeksPerMonth = 365 / 7 / 12;
    const totalMonthlyGross = totalWeeklyGross * avgWeeksPerMonth;

    // 공제 계산
    let deductionRate = 0;
    if (applyInsurance) deductionRate += 0.094; // 4대보험 근로자 부담분 약 9.4%
    if (applyTax) deductionRate += 0.033; // 3.3% 프리랜서/알바 원천징수세

    const deductionAmount = Math.round(totalMonthlyGross * deductionRate);
    const finalMonthlyNet = Math.max(0, totalMonthlyGross - deductionAmount);
    const finalWeeklyNet = Math.max(0, totalWeeklyGross * (1 - deductionRate));

    return {
      hourlyWage,
      weeklyHours,
      isHolidayPayEligible,
      holidayHours: parseFloat(holidayHours.toFixed(2)),
      holidayPay,
      basicWeeklyPay,
      totalWeeklyGross,
      totalMonthlyGross,
      deductionAmount,
      finalWeeklyNet,
      finalMonthlyNet,
    };
  }, [hourlyWageInput, weeklyHoursInput, applyInsurance, applyTax]);

  // 클립보드 복사 핸들러
  const handleCopyResult = () => {
    const textToCopy =
      activeTab === 'salary'
        ? `[2026 연봉 계산 결과]\n• 세전: ${formatWon(salaryResult.monthlyGross)}/월 (연 ${formatWon(salaryResult.annualGross)})\n• 4대보험 공제: ${formatWon(salaryResult.totalInsurance)}\n• 세금 공제: ${formatWon(salaryResult.totalTax)}\n• 예상 실수령액: ${formatWon(salaryResult.monthlyNet)}/월`
        : `[2026 주휴수당 계산 결과]\n• 시급: ${formatWon(hourlyResult.hourlyWage)}\n• 주 근무: ${hourlyResult.weeklyHours}시간\n• 주휴수당: ${formatWon(hourlyResult.holidayPay)}/주\n• 예상 주급: ${formatWon(hourlyResult.totalWeeklyGross)}\n• 예상 월급(주휴포함): ${formatWon(hourlyResult.totalMonthlyGross)}`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 antialiased py-8 px-4 sm:px-6 lg:px-8 font-sans selection:bg-blue-500 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* ── 헤더 & 브랜딩 ── */}
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <span>✨ 2026년 최신 4대보험 요율 완벽 반영</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            2026 연봉 실수령액 & 주휴수당 통합 계산기
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            세전 연봉·월급 실수령액부터 아르바이트 주휴수당·실수령 주급/월급까지 1초 만에 정확하게 계산하세요.
          </p>
        </header>

        {/* ── 탭 전환 네비게이션 ── */}
        <div className="flex p-1.5 bg-slate-800/80 border border-slate-700/80 rounded-2xl max-w-md mx-auto shadow-lg backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setActiveTab('salary')}
            className={`flex-1 py-3 text-sm sm:text-base font-bold rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === 'salary'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            💼 연봉 / 월급 실수령액
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hourly')}
            className={`flex-1 py-3 text-sm sm:text-base font-bold rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === 'hourly'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            ⏱️ 시급 & 주휴수당 계산
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB 1: 연봉 / 월급 계산기                                  */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === 'salary' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
            {/* 입력 폼 (5 cols) */}
            <div className="lg:col-span-5 bg-slate-800/90 border border-slate-700 rounded-3xl p-6 shadow-xl space-y-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-700 pb-3">
                <span>📝 급여 조건 입력</span>
              </h2>

              {/* 연봉 / 월급 선택 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">급여 기준</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-1 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setSalaryType('annual')}
                    className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition ${
                      salaryType === 'annual' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    연봉 기준
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalaryType('monthly')}
                    className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition ${
                      salaryType === 'monthly' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    월급 기준
                  </button>
                </div>
              </div>

              {/* 금액 입력 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex justify-between">
                  <span>{salaryType === 'annual' ? '계약 연봉 (세전)' : '월 기본급 (세전)'}</span>
                  <span className="text-blue-400 font-bold">{formatWon(parseNumber(salaryInput))}</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={salaryInput}
                    onChange={(e) => setSalaryInput(parseNumber(e.target.value).toLocaleString('ko-KR'))}
                    placeholder="예: 40,000,000"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-3 text-lg font-extrabold text-white text-right pr-10 outline-none transition"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">원</span>
                </div>
                {/* 빠른 금액 버튼 */}
                <div className="flex gap-1.5 pt-1 overflow-x-auto pb-1">
                  {(salaryType === 'annual' ? [3000, 4000, 5000, 6000, 8000] : [250, 300, 350, 400, 500]).map(
                    (val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() =>
                          setSalaryInput(
                            (salaryType === 'annual' ? val * 10000 : val * 10000).toLocaleString('ko-KR')
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-600/50 shrink-0 transition"
                      >
                        {val >= 1000 ? `${val / 1000}천만` : `${val}만`}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* 비과세액 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex justify-between">
                  <span>월 비과세액 (식대 등)</span>
                  <span className="text-slate-400">{formatWon(parseNumber(nonTaxableInput))}</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={nonTaxableInput}
                    onChange={(e) => setNonTaxableInput(parseNumber(e.target.value).toLocaleString('ko-KR'))}
                    placeholder="200,000"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-sm font-bold text-white text-right pr-10 outline-none transition"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">원</span>
                </div>
                <p className="text-[11px] text-slate-500">* 2026년 기준 식대 비과세 한도는 월 20만원입니다.</p>
              </div>

              {/* 부양가족 수 및 자녀 수 */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">부양가족 수 (본인포함)</label>
                  <select
                    value={familyCount}
                    onChange={(e) => setFamilyCount(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-bold outline-none focus:border-blue-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                      <option key={num} value={num}>
                        {num}명
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">8~20세 자녀 수</label>
                  <select
                    value={childrenCount}
                    onChange={(e) => setChildrenCount(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-bold outline-none focus:border-blue-500"
                  >
                    {[0, 1, 2, 3, 4, 5].map((num) => (
                      <option key={num} value={num}>
                        {num}명
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 결과 대시보드 (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* 핵심 카드: 월 실수령액 강조 */}
              <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl text-white relative overflow-hidden border border-blue-400/30">
                <div className="relative z-10 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-extrabold uppercase tracking-wider bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-blue-100">
                      2026 예상 월 실수령액
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyResult}
                      className="text-xs font-bold bg-slate-900/60 hover:bg-slate-900 px-3 py-1.5 rounded-lg border border-white/10 transition flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? '✅ 복사완료' : '📋 결과 복사'}
                    </button>
                  </div>

                  <div className="pt-2">
                    <span className="text-3xl sm:text-5xl font-black tracking-tight text-white">
                      {formatWon(salaryResult.monthlyNet)}
                    </span>
                    <span className="text-sm text-blue-200 font-semibold ml-2">/ 월</span>
                  </div>

                  <div className="pt-3 border-t border-white/15 flex flex-wrap justify-between items-center text-xs sm:text-sm text-blue-100">
                    <span>
                      세전 월급: <strong>{formatWon(salaryResult.monthlyGross)}</strong>
                    </span>
                    <span>
                      월 공제 합계: <strong className="text-rose-300">-{formatWon(salaryResult.totalDeduction)}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* 공제 상세 내역 리포트 */}
              <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-slate-300 flex justify-between items-center border-b border-slate-700 pb-3">
                  <span>📊 4대보험 & 소득세 상세 공제표</span>
                  <span className="text-xs font-normal text-slate-400">
                    공제비율 {salaryResult.monthlyGross > 0 ? ((salaryResult.totalDeduction / salaryResult.monthlyGross) * 100).toFixed(1) : 0}%
                  </span>
                </h3>

                <div className="space-y-2.5 text-xs sm:text-sm">
                  {/* 국민연금 */}
                  <div className="flex justify-between items-center py-1 border-b border-slate-700/50">
                    <span className="text-slate-400">국민연금 (4.5%)</span>
                    <span className="font-bold text-slate-200">{formatWon(salaryResult.nationalPension)}</span>
                  </div>
                  {/* 건강보험 */}
                  <div className="flex justify-between items-center py-1 border-b border-slate-700/50">
                    <span className="text-slate-400">건강보험 (3.545%)</span>
                    <span className="font-bold text-slate-200">{formatWon(salaryResult.healthInsurance)}</span>
                  </div>
                  {/* 장기요양보험 */}
                  <div className="flex justify-between items-center py-1 border-b border-slate-700/50">
                    <span className="text-slate-400">장기요양보험 (건보의 12.95%)</span>
                    <span className="font-bold text-slate-200">{formatWon(salaryResult.longTermCare)}</span>
                  </div>
                  {/* 고용보험 */}
                  <div className="flex justify-between items-center py-1 border-b border-slate-700/50">
                    <span className="text-slate-400">고용보험 (0.9%)</span>
                    <span className="font-bold text-slate-200">{formatWon(salaryResult.employmentInsurance)}</span>
                  </div>
                  {/* 소득세 */}
                  <div className="flex justify-between items-center py-1 border-b border-slate-700/50">
                    <span className="text-slate-400">근로소득세 (간이세액)</span>
                    <span className="font-bold text-slate-200">{formatWon(salaryResult.incomeTax)}</span>
                  </div>
                  {/* 지방소득세 */}
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400">지방소득세 (소득세의 10%)</span>
                    <span className="font-bold text-slate-200">{formatWon(salaryResult.localIncomeTax)}</span>
                  </div>
                </div>

                {/* 연간 환산 요약 */}
                <div className="mt-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-700/80 flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-slate-300 font-semibold">예상 연간 총 실수령액</span>
                  <span className="text-base sm:text-lg font-extrabold text-blue-400">
                    {formatWon(salaryResult.annualNet)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB 2: 알바 시급 & 주휴수당 계산기                          */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === 'hourly' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
            {/* 입력 폼 (5 cols) */}
            <div className="lg:col-span-5 bg-slate-800/90 border border-slate-700 rounded-3xl p-6 shadow-xl space-y-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-700 pb-3">
                <span>⏱️ 근무 조건 입력</span>
              </h2>

              {/* 시급 입력 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex justify-between">
                  <span>시급</span>
                  <span className="text-blue-400 font-bold">{formatWon(parseNumber(hourlyWageInput))}</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={hourlyWageInput}
                    onChange={(e) => setHourlyWageInput(parseNumber(e.target.value).toLocaleString('ko-KR'))}
                    placeholder="10,030"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-3 text-lg font-extrabold text-white text-right pr-10 outline-none transition"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">원</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setHourlyWageInput('10,030')}
                    className="px-2.5 py-1 rounded-lg bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 text-xs font-semibold border border-blue-700/50 transition"
                  >
                    2026년 최저시급 (10,030원)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHourlyWageInput('11,000')}
                    className="px-2.5 py-1 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-600 transition"
                  >
                    11,000원
                  </button>
                </div>
              </div>

              {/* 1주일 총 근무시간 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex justify-between">
                  <span>1주일 총 근무시간</span>
                  <span className="text-indigo-400 font-bold">{hourlyResult.weeklyHours}시간</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="80"
                    value={weeklyHoursInput}
                    onChange={(e) => setWeeklyHoursInput(e.target.value)}
                    placeholder="20"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-base font-bold text-white text-right pr-14 outline-none transition"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">시간/주</span>
                </div>
                {/* 주 15시간 미만 경고 알림 */}
                {hourlyResult.weeklyHours > 0 && !hourlyResult.isHolidayPayEligible && (
                  <p className="text-[11.5px] text-amber-400 bg-amber-950/40 border border-amber-800/50 rounded-lg p-2 mt-1">
                    ⚠️ 주 15시간 미만 근무 시 근로기준법상 주휴수당 지급 대상에서 제외됩니다.
                  </p>
                )}
              </div>

              {/* 공제 옵션 체크박스 */}
              <div className="space-y-2 pt-2 border-t border-slate-700/60">
                <label className="text-xs font-bold text-slate-300 block">공제 옵션 선택</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-700 cursor-pointer hover:border-slate-600 transition">
                    <input
                      type="checkbox"
                      checked={applyInsurance}
                      onChange={(e) => setApplyInsurance(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-200">4대보험 공제 (약 9.4%)</span>
                      <p className="text-slate-400 text-[10.5px]">월 60시간 이상 근무 시 의무 가입</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-700 cursor-pointer hover:border-slate-600 transition">
                    <input
                      type="checkbox"
                      checked={applyTax}
                      onChange={(e) => setApplyTax(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-200">3.3% 원천징수세 공제</span>
                      <p className="text-slate-400 text-[10.5px]">프리랜서 / 3.3% 알바 소득세</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* 주휴수당 결과 대시보드 (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* 핵심 카드: 주휴수당 포함 월 환산액 */}
              <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl text-white border border-indigo-400/30">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-extrabold uppercase tracking-wider bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-indigo-100">
                      예상 월 총 수령액 (주휴수당 포함)
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyResult}
                      className="text-xs font-bold bg-slate-900/60 hover:bg-slate-900 px-3 py-1.5 rounded-lg border border-white/10 transition flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? '✅ 복사완료' : '📋 결과 복사'}
                    </button>
                  </div>

                  <div className="pt-2">
                    <span className="text-3xl sm:text-5xl font-black tracking-tight text-white">
                      {formatWon(hourlyResult.finalMonthlyNet)}
                    </span>
                    <span className="text-sm text-indigo-200 font-semibold ml-2">/ 월</span>
                  </div>

                  <div className="pt-3 border-t border-white/15 flex flex-wrap justify-between items-center text-xs sm:text-sm text-indigo-100">
                    <span>
                      예상 실수령 주급: <strong>{formatWon(hourlyResult.finalWeeklyNet)}</strong>
                    </span>
                    <span>
                      주휴수당: <strong>{formatWon(hourlyResult.holidayPay)}/주</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* 주휴수당 상세 내역표 */}
              <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-slate-300 border-b border-slate-700 pb-3">
                  📋 주급 & 주휴수당 산출 내역
                </h3>

                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="flex justify-between items-center py-1 border-b border-slate-700/50">
                    <span className="text-slate-400">기본 주급 ({hourlyResult.weeklyHours}시간 × 시급)</span>
                    <span className="font-bold text-slate-200">{formatWon(hourlyResult.basicWeeklyPay)}</span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-700/50">
                    <div>
                      <span className="text-slate-400 block">주휴수당 ({hourlyResult.holidayHours}시간분)</span>
                      <span className="text-[11px] text-slate-500">
                        {hourlyResult.isHolidayPayEligible ? '✅ 주 15시간 이상 충족' : '❌ 주 15시간 미만 (미발생)'}
                      </span>
                    </div>
                    <span className="font-extrabold text-blue-400">{formatWon(hourlyResult.holidayPay)}</span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-700/50">
                    <span className="text-slate-400">주당 총 세전 지급액</span>
                    <span className="font-bold text-slate-200">{formatWon(hourlyResult.totalWeeklyGross)}</span>
                  </div>

                  {hourlyResult.deductionAmount > 0 && (
                    <div className="flex justify-between items-center py-1 text-rose-400">
                      <span>공제 금액 (4대보험/소득세)</span>
                      <span className="font-bold">-{formatWon(hourlyResult.deductionAmount)}</span>
                    </div>
                  )}
                </div>

                {/* 주휴수당 계산 공식 가이드 팁 */}
                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-700 text-xs text-slate-400 space-y-1">
                  <p className="font-bold text-slate-300">💡 주휴수당 계산 공식</p>
                  <p>• 주 40시간 미만: (1주일 총 근로시간 ÷ 40시간) × 8시간 × 시급</p>
                  <p>• 주 40시간 이상: 8시간 × 시급 (최대 8시간 한도)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SEO 및 정보성 가이드 & FAQ 아티클 섹션                      */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section className="bg-slate-800/60 border border-slate-700/80 rounded-3xl p-6 sm:p-8 space-y-8 mt-12 text-slate-300">
          <div className="border-b border-slate-700 pb-4">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              2026년 4대보험 요율 및 주휴수당 기준 총정리 가이드
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              근로자와 고용주 모두 꼭 알아야 할 최신 법정 공제 기준 및 노무 상식
            </p>
          </div>

          {/* 4대보험 요율표 */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>📌 2026년 4대보험 요율표 (근로자 부담분 기준)</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/80 text-slate-200">
                    <th className="py-2.5 px-3">보험 종류</th>
                    <th className="py-2.5 px-3">근로자 부담 요율</th>
                    <th className="py-2.5 px-3">사업주 부담 요율</th>
                    <th className="py-2.5 px-3">기준 및 비고</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 text-slate-300">
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-white">국민연금</td>
                    <td className="py-2.5 px-3 text-blue-400 font-bold">4.5%</td>
                    <td className="py-2.5 px-3">4.5%</td>
                    <td className="py-2.5 px-3 text-slate-400">월 상한액 617만원 / 하한액 39만원 적용</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-white">건강보험</td>
                    <td className="py-2.5 px-3 text-blue-400 font-bold">3.545%</td>
                    <td className="py-2.5 px-3">3.545%</td>
                    <td className="py-2.5 px-3 text-slate-400">총 7.09%의 50% 부담</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-white">장기요양보험</td>
                    <td className="py-2.5 px-3 text-blue-400 font-bold">건보료의 12.95%</td>
                    <td className="py-2.5 px-3">건보료의 12.95%</td>
                    <td className="py-2.5 px-3 text-slate-400">건강보험료에 연동 부과</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-white">고용보험</td>
                    <td className="py-2.5 px-3 text-blue-400 font-bold">0.9%</td>
                    <td className="py-2.5 px-3">1.15% ~ 1.75%</td>
                    <td className="py-2.5 px-3 text-slate-400">실업급여 지원 목적</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-white">산재보험</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">0% (전액 면제)</td>
                    <td className="py-2.5 px-3">전액 사업주 부담</td>
                    <td className="py-2.5 px-3 text-slate-400">근로자 공제 없음</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 주휴수당 조건 & FAQ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-3 bg-slate-900/60 p-5 rounded-2xl border border-slate-700/60">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>❓ 주휴수당 지급 조건 3가지</span>
              </h4>
              <ul className="text-xs sm:text-sm space-y-2 text-slate-300 list-disc list-inside leading-relaxed">
                <li>
                  <strong className="text-white">주 15시간 이상 근로:</strong> 4주간 평균하여 1주 동안 소정근로시간이 15시간 이상이어야 합니다.
                </li>
                <li>
                  <strong className="text-white">소정근로일 개근:</strong> 약속된 근무일에 결근 없이 모두 출근해야 합니다 (지각·조퇴는 출근으로 인정).
                </li>
                <li>
                  <strong className="text-white">다음 주 근로 예정:</strong> 계약 형태와 무관하게 계속 근로가 예정되어 있어야 합니다.
                </li>
              </ul>
            </div>

            <div className="space-y-3 bg-slate-900/60 p-5 rounded-2xl border border-slate-700/60">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>💡 식대 비과세 20만원 혜택</span>
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                급여 항목 중 <strong className="text-white">비과세 식대(월 최대 20만원)</strong>는 4대보험료 및 소득세 산정 기준 금액에서 제외됩니다.
                따라서 기본급 300만원보다 기본급 280만원 + 비과세 식대 20만원으로 구성하는 것이 근로자의 실수령액이 더 높습니다.
              </p>
            </div>
          </div>

          {/* 푸터 안내 */}
          <div className="text-center pt-4 border-t border-slate-700/60 text-xs text-slate-500">
            <p>© 2026 연봉 실수령액 & 주휴수당 통합 계산기. 본 계산 결과는 간이세액표 및 표준 요율 기준 모의 계산치로, 실제 급여명세서와 소폭의 차이가 있을 수 있습니다.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

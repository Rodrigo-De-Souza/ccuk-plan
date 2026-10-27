'use client';

import React, { useState, useEffect } from 'react';


// Tipos
interface Employee {
  id: string;
  name: string;
  gender: 'M' | 'F';
  partnerId?: string | null;
}

interface Unavailability {
  employeeId: string;
  occurrenceKey: string;
}

interface WeeklyOccurrence {
  date: Date;
  dateString: string;
  occurrenceKey: string;
  dayName: '(Quarta-Feira)' | 'Sábado' | 'Domingo';
  occurrenceIndex: number;
}

type ScheduleTime = '19:00 - 22:00' | '17:30 - 21:30' | '09:00 - 12:30';

interface Assignment {
  occurrence: WeeklyOccurrence;
  scheduleTime: ScheduleTime;
  assignedMan: Employee | null;
  assignedWoman: Employee | null;
  observation?: string;
}

export default function Swindon() {
  // Lista oficial de funcionários
  const [employees, setEmployees] = useState<Employee[]>([
    // Irmãos
    { id: 'andre', name: 'Andre', gender: 'M' },
    { id: 'giovanni', name: 'Giovanni', gender: 'M' },
    { id: 'josue', name: 'Josué', gender: 'M' },
    { id: 'marcos', name: 'Marcos', gender: 'M' },
    { id: 'mauricio', name: 'Mauricio', gender: 'M' },
    { id: 'renato', name: 'Renato', gender: 'M' },
    { id: 'ronaldo', name: 'Ronaldo', gender: 'M' },
    // Mulheres
    { id: 'alana', name: 'Alana', gender: 'F' },
    { id: 'debora', name: 'Debora', gender: 'F' },
    { id: 'elaine', name: 'Elaine', gender: 'F' },
    { id: 'jucilene', name: 'Jucilene', gender: 'F' },
  ]);

  const [newEmployeeName, setNewEmployeeName] = useState<string>('');
  const [newEmployeeGender, setNewEmployeeGender] = useState<'M' | 'F'>('M');
  const [unavailabilities, setUnavailabilities] = useState<Unavailability[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear] = useState<number>(new Date().getFullYear());
  const [schedule, setSchedule] = useState<Assignment[]>([]);

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newEmployeeName.trim();
    if (!trimmedName) return;

    const newId = trimmedName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');

    if (employees.some(emp => emp.id === newId)) {
      alert('Já existe um Irm com este nome!');
      return;
    }

    setEmployees([...employees, { id: newId, name: trimmedName, gender: newEmployeeGender }]);
    setNewEmployeeName('');
  };

  const handleRemoveEmployee = (id: string) => {
    setEmployees(prev => prev
      .filter(emp => emp.id !== id)
      .map(emp => ({ ...emp, partnerId: emp.partnerId === id ? null : emp.partnerId }))
    );
    setUnavailabilities(unavailabilities.filter(u => u.employeeId !== id));
  };

  const handleEmployeePartnerChange = (employeeId: string, partnerId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return;

    const normalizedPartnerId = partnerId || null;

    setEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        return { ...emp, partnerId: normalizedPartnerId };
      }

      if (emp.id === normalizedPartnerId) {
        return { ...emp, partnerId: employeeId };
      }

      return emp;
    }));
  };

  // Auxiliar: Busca os 3 blocos semanais do mês (Quarta-Feira, Sábado e Domingo)
  const getWeeklyOccurrencesInMonth = (year: number, month: number): WeeklyOccurrence[] => {
    const occurrences: WeeklyOccurrence[] = [];
    const counts = {
      quarta: 0,
      sabado: 0,
      domingo: 0,
    };

    const date = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    for (let current = new Date(date); current <= lastDay; current.setDate(current.getDate() + 1)) {
      const dayNumber = current.getDay();
      const normalizedDay =
        dayNumber === 3 ? 'quarta' :
        dayNumber === 6 ? 'sabado' :
        dayNumber === 0 ? 'domingo' : null;

      if (!normalizedDay) continue;

      counts[normalizedDay] += 1;
      const dayName = normalizedDay === 'quarta'
        ? '(Quarta-feira)'
        : normalizedDay === 'sabado'
          ? 'Sábado'
          : 'Domingo';

      occurrences.push({
        date: new Date(current),
        dateString: current.toLocaleDateString('pt-BR', {
          day: 'numeric',
          month: 'short',
        }),
        occurrenceKey: `${normalizedDay}-${counts[normalizedDay]}`,
        dayName,
        occurrenceIndex: counts[normalizedDay],
      });
    }

    return occurrences;
  };

  const getDefaultScheduleTime = (occurrence: WeeklyOccurrence): ScheduleTime => {
    if (occurrence.dayName === '(Quarta-feira)') return '19:00 - 22:00';
    if (occurrence.dayName === 'Sábado') return '17:30 - 21:30';
    return '09:00 - 12:30';
  };

  const getServiceLabel = (dayName: '(Quarta-feira)' | 'Sábado' | 'Domingo') => {
    if (dayName === 'Domingo') return 'Reunião de Jovens e Menores aos Domingos';
    if (dayName === 'Sábado') return 'Cultos aos Sábados';
    return 'Cultos às Quartas-feiras';
  };

  const getOrderedServiceDays = () => {
    const baseOrder = ['(Quarta-feira)', 'Sábado', 'Domingo'] as const;
    const firstOccurrence = [...schedule].sort(
      (a, b) => a.occurrence.date.getTime() - b.occurrence.date.getTime()
    )[0];

    if (!firstOccurrence) return [...baseOrder];

    const startIndex = baseOrder.indexOf(firstOccurrence.occurrence.dayName);
    return [...baseOrder.slice(startIndex), ...baseOrder.slice(0, startIndex)];
  };

  const getOccurrenceLabel = (occurrence: WeeklyOccurrence) => `${occurrence.occurrenceIndex}º ${occurrence.dayName}`;

  // Lógica de Sorteio Automático Inicial
  const generateSchedule = () => {
    const weeklyOccurrences = getWeeklyOccurrencesInMonth(selectedYear, selectedMonth);
    let lastAssignedWomanId: string | null = null;
    let lastAssignedManId: string | null = null;

    const configuredCouples = employees
      .filter(emp => emp.gender === 'M' && emp.partnerId)
      .map(man => {
        const woman = employees.find(emp => emp.id === man.partnerId && emp.gender === 'F');
        if (!woman) return null;
        return { man, woman };
      })
      .filter((pair): pair is { man: Employee; woman: Employee } => pair !== null);

    const newSchedule: Assignment[] = weeklyOccurrences.map((occurrence) => {
      const isUnavailable = (empId: string) =>
        unavailabilities.some(u => u.employeeId === empId && u.occurrenceKey === occurrence.occurrenceKey);

      const availableMen = employees.filter(emp => emp.gender === 'M' && !isUnavailable(emp.id));
      const availableWomen = employees.filter(emp => emp.gender === 'F' && !isUnavailable(emp.id));

      let chosenMan: Employee | null = null;
      let chosenWoman: Employee | null = null;

      const availableCouples = configuredCouples.filter(({ man, woman }) =>
        !isUnavailable(man.id) && !isUnavailable(woman.id)
      );

      if (availableCouples.length > 0) {
        // Prefer couples that avoid repeating the last assigned man and woman when possible
        const preferredCouples = availableCouples.filter(pair => pair.woman.id !== lastAssignedWomanId && pair.man.id !== lastAssignedManId);
        const preferredByWoman = availableCouples.filter(pair => pair.woman.id !== lastAssignedWomanId);
        const preferredByMan = availableCouples.filter(pair => pair.man.id !== lastAssignedManId);

        const pool = preferredCouples.length > 0 ? preferredCouples
          : (preferredByWoman.length > 0 ? preferredByWoman
            : (preferredByMan.length > 0 ? preferredByMan : availableCouples));

        const selectedCouple = pool[Math.floor(Math.random() * pool.length)];

        chosenMan = selectedCouple.man;
        chosenWoman = selectedCouple.woman;
      } else {
        // Pick a man avoiding repeating the last assigned man if possible
        let malePool = [...availableMen];
        if (lastAssignedManId) {
          const filteredNonConsecutive = malePool.filter(m => m.id !== lastAssignedManId);
          if (filteredNonConsecutive.length > 0) malePool = filteredNonConsecutive;
        }
        const man = malePool.length > 0 ? malePool[Math.floor(Math.random() * malePool.length)] : null;

        // Pick a woman avoiding repeating the last assigned woman if possible
        let femalePool = [...availableWomen];
        if (lastAssignedWomanId) {
          const filteredNonConsecutive = femalePool.filter(w => w.id !== lastAssignedWomanId);
          if (filteredNonConsecutive.length > 0) femalePool = filteredNonConsecutive;
        }
        const woman = femalePool.length > 0 ? femalePool[Math.floor(Math.random() * femalePool.length)] : null;

        chosenMan = man;
        chosenWoman = woman;
      }

      // If possible, avoid repeating the same man/woman consecutively
      if (chosenMan && chosenMan.id === lastAssignedManId) {
        const altMen = employees.filter(emp => emp.gender === 'M' && emp.id !== lastAssignedManId && !unavailabilities.some(u => u.employeeId === emp.id && u.occurrenceKey === occurrence.occurrenceKey));
        if (altMen.length > 0) {
          chosenMan = altMen[Math.floor(Math.random() * altMen.length)];
        }
      }

      if (chosenWoman && chosenWoman.id === lastAssignedWomanId) {
        const altWomen = employees.filter(emp => emp.gender === 'F' && emp.id !== lastAssignedWomanId && !unavailabilities.some(u => u.employeeId === emp.id && u.occurrenceKey === occurrence.occurrenceKey));
        if (altWomen.length > 0) {
          chosenWoman = altWomen[Math.floor(Math.random() * altWomen.length)];
        }
      }

      lastAssignedWomanId = chosenWoman ? chosenWoman.id : null;
      lastAssignedManId = chosenMan ? chosenMan.id : null;

      return {
        occurrence,
        scheduleTime: getDefaultScheduleTime(occurrence),
        assignedMan: chosenMan,
        assignedWoman: chosenWoman,
      observation: '',
      };
    });

    setSchedule(newSchedule);
  };

  useEffect(() => {
    // This intentionally rebuilds the generated schedule when the available team or month changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    generateSchedule();
  }, [selectedMonth, unavailabilities, employees]);

  // Trata a alteração manual via Dropdown na tabela final
  const handleManualOverride = (
    index: number,
    field: 'assignedMan' | 'assignedWoman',
    employeeId: string
  ) => {
    const updatedSchedule = [...schedule];
    const selectedEmployee = employees.find(emp => emp.id === employeeId) || null;

    updatedSchedule[index][field] = selectedEmployee;
    setSchedule(updatedSchedule);
  };

  const handleScheduleTimeChange = (
    index: number,
    scheduleTime: ScheduleTime
  ) => {
    const updatedSchedule = [...schedule];
    updatedSchedule[index].scheduleTime = scheduleTime;
    setSchedule(updatedSchedule);
  };

  const handleObservationChange = (index: number, observation: string) => {
    const updatedSchedule = [...schedule];
    updatedSchedule[index].observation = observation;
    setSchedule(updatedSchedule);
  };

  const handleExportSchedule = () => {
    const rows = [
      ['Data', 'Ocorrência', 'Horário Abertura/Fechamento', 'Observação', 'Irmão', 'Irmã'],
      ...schedule.map(item => [
        item.occurrence.dateString,
        getOccurrenceLabel(item.occurrence),
        item.scheduleTime,
        item.observation || '-',
        item.assignedMan?.name || '-',
        item.assignedWoman?.name || '-',
      ]),
    ];

    const csvContent = rows
      .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `escala-${selectedMonth + 1}-${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handlePrintSchedule = () => {
    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) {
      alert('O popup foi bloqueado. Permita pop-ups para abrir a versão de impressão.');
      return;
    }

    const blockSections = getOrderedServiceDays().map((dayName) => {
      const dayEntries = schedule.filter(item => item.occurrence.dayName === dayName);
      if (dayEntries.length === 0) return '';

      const rowsHtml = dayEntries.map((item) => {
        return `
          <tr>
            <td>${item.occurrence.dateString}</td>
            <td>${getOccurrenceLabel(item.occurrence)}</td>
            <td>${item.scheduleTime}</td>
            <td>${item.observation || '-'}</td>
            <td>${item.assignedMan?.name || '-'}</td>
            <td>${item.assignedWoman?.name || '-'}</td>
          </tr>
        `;
      }).join('');

      return `
        <section style="margin-bottom: 26px;">
          <h2 style="margin: 0 0 10px; font-size: 18px;">${dayName === 'Domingo' ? 'Reunião de Jovens e Menores aos Domingos' : dayName === 'Sábado' ? 'Cultos aos Sábados' : 'Cultos às Quartas-feiras'}</h2>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Ocorrência</th>
                <th>Horário</th>
                <th>Observação</th>
                <th>Irmão</th>
                <th>Irmã</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="5">Sem escala gerada.</td></tr>'}
            </tbody>
          </table>
        </section>
      `;
    }).join('');

    const monthName = new Date(selectedYear, selectedMonth).toLocaleString('pt-BR', { month: 'long' });
    const monthLabel = `${monthName} - ${selectedYear}`;

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Escala dos Auxiliares da Porta - Swindon</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              color: #111827;
              background: #fff;
            }
            .container {
              width: 100%;
              padding: 20px;
              box-sizing: border-box;
            }
            h1 {
              text-align: center;
              font-size: 26px;
              margin: 0 0 18px;
            }
            h2 {
              font-size: 18px;
              margin: 0 0 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: auto;
              margin-bottom: 12px;
            }
            th, td {
              border: 1px solid #d1d5db;
              padding: 10px 8px;
              text-align: left;
              font-size: 12px;
              vertical-align: middle;
              word-break: break-word;
            }
            th {
              background: #f3f4f6;
              font-weight: 700;
            }
            @media print {
              body { background: white; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div style="text-align:center; margin-bottom:10px;">
              <img src="https://christiancongregation.org.uk/wp-content/themes/ccuk-theme/CCUK-Original-Logo-250x126-1.png" alt="CCUK Logo" style="max-width:260px; height:auto; display:inline-block;" />
            </div>
            <h1>Escala dos Auxiliares da Porta - Swindon</h1>
            <h2 style="text-align:center; font-size:16px; margin:6px 0 14px; text-transform: capitalize;">${monthLabel}</h2>

            ${blockSections || '<p>Sem escala gerada.</p>'}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  const toggleUnavailability = (employeeId: string, occurrenceKey: string) => {
    setUnavailabilities((prev) => {
      const exists = prev.some(u => u.employeeId === employeeId && u.occurrenceKey === occurrenceKey);
      if (exists) {
        return prev.filter(u => !(u.employeeId === employeeId && u.occurrenceKey === occurrenceKey));
      } else {
        return [...prev, { employeeId, occurrenceKey }];
      }
    });
  };

  // occurrences for the selected month (used by the Unavailability matrix)
  const monthlyOccurrences = getWeeklyOccurrencesInMonth(selectedYear, selectedMonth);



  return (
    <>
    <style jsx global>{`
      @media print {
        @page {
          margin: 12mm;
          size: A4 portrait;
        }

        html, body {
          background: #fff !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        body {
          margin: 0;
        }

        .print-hidden {
          display: none !important;
        }

        .print-schedule {
          display: block !important;
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          border: none !important;
          background: #fff !important;
        }

        .print-schedule table {
          width: 100% !important;
          min-width: 0 !important;
          table-layout: fixed;
          border-collapse: collapse;
        }

        .print-schedule th,
        .print-schedule td {
          font-size: 11px !important;
          padding: 6px !important;
          word-wrap: break-word;
          overflow-wrap: anywhere;
        }
      }
    `}</style>
    <div className="w-full max-w-6xl mx-auto p-3 sm:p-6 bg-gray-50 min-h-screen">
      <h1 className="print-hidden text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6 text-center">
        📅 Escala dos Auxiliares da Porta - Swindon (1 Irmão & 1 Irmã)
      </h1>

      {/* Painel de Controle Superior */}
      <div className="print-hidden grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <form onSubmit={handleAddEmployee} className="bg-white p-4 rounded-xl shadow-sm xl:col-span-2 flex flex-col justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">Nome do Irmão/Irmã</label>
              <input
                type="text"
                value={newEmployeeName}
                onChange={(e) => setNewEmployeeName(e.target.value)}
                placeholder="Ex: Irmão ou Irmã"
                className="w-full border border-gray-300 rounded-lg p-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Gênero</label>
              <select
                value={newEmployeeGender}
                onChange={(e) => setNewEmployeeGender(e.target.value as 'M' | 'F')}
                className="w-full border border-gray-300 rounded-lg p-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="M">Irmão</option>
                <option value="F">Irmã</option>
              </select>
            </div>
          </div>
          <button type="submit" className="mt-3 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors w-full sm:w-auto">
            ➕ Adicionar à Equipe
          </button>
        </form>

        <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col justify-between gap-3 xl:order-none order-2">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Selecionar Mês</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i} value={i}>
                  {new Date(selectedYear, i).toLocaleString('pt-BR', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Definir Casais (separate card) */}
      <div className="print-hidden bg-white p-3 sm:p-6 rounded-xl shadow-sm mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-3">Definir Casais</h2>
        <div className="overflow-x-auto -mx-2 sm:mx-0 pb-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="p-2 sm:p-3 text-[11px] sm:text-sm font-semibold text-gray-600">Irmãos/Irmãs</th>
                <th className="p-2 sm:p-3 text-[11px] sm:text-sm font-semibold text-gray-600 text-center">Gênero</th>
                <th className="p-2 sm:p-3 text-[11px] sm:text-sm font-semibold text-gray-600 text-center">Casal</th>
                <th className="p-2 sm:p-3 text-[11px] sm:text-sm font-semibold text-gray-600 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={`couple-${emp.id}`} className="border-b border-gray-100 hover:bg-gray-50 group align-top">
                  <td className="p-2 sm:p-3 font-medium text-gray-800 min-w-[160px]">{emp.name}</td>
                  <td className="p-2 sm:p-3 text-center">
                    <span className={`inline-block text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full ${emp.gender === 'M' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}`}>
                      {emp.gender === 'M' ? 'Irmão' : 'Irmã'}
                    </span>
                  </td>
                  <td className="p-2 sm:p-3 text-center min-w-[170px]">
                    <select
                      value={emp.partnerId ?? ''}
                      onChange={(e) => handleEmployeePartnerChange(emp.id, e.target.value)}
                      className="w-full max-w-[180px] border border-gray-300 rounded-lg p-1.5 text-[10px] sm:text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sem casal</option>
                      {employees
                        .filter(other => {
                          if (other.id === emp.id) return false;
                          if (other.gender === emp.gender) return false;
                          // allow if other is unpaired (null/undefined), or if other is already partner of this emp
                          return other.partnerId == null || other.partnerId === emp.id;
                        })
                        .map(other => (
                          <option key={other.id} value={other.id}>{other.name}</option>
                        ))}
                    </select>
                  </td>
                  <td className="p-2 sm:p-3 text-center">
                    <button onClick={() => handleRemoveEmployee(emp.id)} className="text-red-500 hover:text-red-700 text-[10px] sm:text-xs font-medium bg-red-50 px-2 py-1 rounded">
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Matriz de Indisponibilidade */}
      <div className="print-hidden bg-white p-3 sm:p-6 rounded-xl shadow-sm mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-3">Definir Indisponibilidades</h2>
        <div className="flex flex-col gap-4 pb-2">
          {(['(Quarta-feira)', 'Sábado', 'Domingo'] as const).map((dayLabel) => {
            const occs = monthlyOccurrences.filter(o => o.dayName === dayLabel);
            return (
              <div key={dayLabel} className="bg-white p-3 rounded-xl shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-2 text-center">{dayLabel}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[320px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="p-2 text-[11px] sm:text-sm font-semibold text-gray-600">Irmãos/Irmãs</th>
                        <th className="p-2 text-[11px] sm:text-sm font-semibold text-gray-600 text-center">Gênero</th>
                        {occs.map(occ => (
                          <th key={occ.occurrenceKey} className="p-2 text-[11px] sm:text-sm font-semibold text-gray-600 text-center">
                            <div className="whitespace-nowrap">{occ.dateString}</div>
                            <div className="text-[10px] text-gray-500">{occ.dayName}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map(emp => (
                        <tr key={`${dayLabel}-${emp.id}`} className="border-b border-gray-100 hover:bg-gray-50 group align-top">
                          <td className="p-2 font-medium text-gray-800 min-w-[140px]">{emp.name}</td>
                          <td className="p-2 text-center">
                            <span className={`inline-block text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full ${emp.gender === 'M' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}`}>
                              {emp.gender === 'M' ? 'Irmão' : 'Irmã'}
                            </span>
                          </td>
                          {occs.map(occ => {
                            const occurrenceKey = occ.occurrenceKey;
                            const isChecked = unavailabilities.some(u => u.employeeId === emp.id && u.occurrenceKey === occurrenceKey);
                            return (
                              <td key={`${emp.id}-${occurrenceKey}`} className="p-2 text-center">
                                <input type="checkbox" checked={isChecked} onChange={() => toggleUnavailability(emp.id, occurrenceKey)} className="h-4 w-4 text-blue-600 rounded border-gray-300 cursor-pointer" />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="print-hidden mb-6 xl:mt-[-8px]">
        <button onClick={generateSchedule} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors w-full sm:w-auto">
          🎲 Sortear Escala
        </button>
      </div>

      {/* Tabela de Escala Gerada com Dropdowns */}
      <div className="print-schedule bg-white p-3 sm:p-6 rounded-xl shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-700">Escala dos Auxiliares da Porta - Swindon</h2>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={handlePrintSchedule}
              className="bg-slate-700 hover:bg-slate-800 text-white font-semibold py-2 px-4 rounded-lg transition-colors w-full sm:w-auto"
            >
              🖨️ Versão para Impressão
            </button>
            <button
              onClick={handleExportSchedule}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors w-full sm:w-auto"
            >
              📤 Exportar Escala
            </button>
          </div>
        </div>

        {getOrderedServiceDays().map((dayName) => {
          const dayEntries = schedule.filter(item => item.occurrence.dayName === dayName);
          if (dayEntries.length === 0) return null;

          const sectionLabel = getServiceLabel(dayName);

          return (
            <div key={dayName} className="mb-6 last:mb-0">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3">{sectionLabel}</h3>
              <div className="overflow-x-auto -mx-2 sm:mx-0 pb-2">
                <table className="w-full min-w-[820px] text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-200 bg-gray-100">
                      <th className="p-2 sm:p-3 text-[11px] sm:text-sm font-semibold text-gray-700">Data</th>
                      <th className="p-2 sm:p-3 text-[11px] sm:text-sm font-semibold text-gray-700">Ocorrência</th>
                      <th className="p-2 sm:p-3 text-[11px] sm:text-sm font-semibold text-gray-700">Horário Abertura/Fechamento</th>
                      <th className="p-2 sm:p-3 text-[11px] sm:text-sm font-semibold text-gray-700">Observação</th>
                      <th className="p-2 sm:p-3 text-[11px] sm:text-sm font-semibold text-gray-700">Irmão</th>
                      <th className="p-2 sm:p-3 text-[11px] sm:text-sm font-semibold text-gray-700">Irmã</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayEntries.map((item, idx) => {
                      const globalIndex = schedule.findIndex(entry => entry.occurrence.occurrenceKey === item.occurrence.occurrenceKey && entry.occurrence.date.getTime() === item.occurrence.date.getTime());
                      const isUnavailable = (empId: string) =>
                        unavailabilities.some(u => u.employeeId === empId && u.occurrenceKey === item.occurrence.occurrenceKey);

                      const availableMen = employees.filter(emp => emp.gender === 'M' && !isUnavailable(emp.id));
                      const availableWomen = employees.filter(emp => emp.gender === 'F' && !isUnavailable(emp.id));

                      return (
                        <tr key={`${item.occurrence.occurrenceKey}-${idx}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors align-top">
                          <td className="p-2 sm:p-3 font-medium text-gray-800 capitalize text-sm">{item.occurrence.dateString}</td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm text-gray-500">{getOccurrenceLabel(item.occurrence)}</td>
                          <td className="p-2 sm:p-3">
                            <select
                              value={item.scheduleTime}
                              onChange={(e) => handleScheduleTimeChange(globalIndex, e.target.value as ScheduleTime)}
                              className="bg-gray-50 text-gray-800 font-medium px-2 py-1 rounded text-xs sm:text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 cursor-pointer w-full max-w-[220px]"
                            >
                              <option value="19:00 - 22:00">19:00 - 22:00</option>
                              <option value="17:30 - 21:30">17:30 - 21:30</option>
                              <option value="09:00 - 12:30">09:00 - 12:30</option>
                            </select>
                          </td>
                          <td className="p-2 sm:p-3">
                            <select
                              value={item.observation ?? ''}
                              onChange={(e) => handleObservationChange(globalIndex, e.target.value)}
                              className="bg-gray-50 text-gray-800 font-medium px-2 py-1 rounded text-xs sm:text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 cursor-pointer w-full max-w-[220px]"
                            >
                              <option value="">Vazio</option>
                              <option value="Ensaio">Ensaio</option>
                              <option value='Fechamento Coleta'>Fechamento Coleta</option>
                            </select>
                          </td>

                          <td className="p-2 sm:p-3">
                            <select
                              value={item.assignedMan?.id || ''}
                              onChange={(e) => handleManualOverride(globalIndex, 'assignedMan', e.target.value)}
                              className="bg-blue-50 text-blue-800 font-medium px-2 py-1 rounded text-xs sm:text-sm border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer w-full max-w-[160px]"
                            >
                              <option value="">Vazio</option>
                              {availableMen.map(m => (
                                <option key={m.id} value={m.id}> {m.name}</option>
                              ))}
                            </select>
                          </td>

                          <td className="p-2 sm:p-3">
                            <select
                              value={item.assignedWoman?.id || ''}
                              onChange={(e) => handleManualOverride(globalIndex, 'assignedWoman', e.target.value)}
                              className="bg-pink-50 text-pink-800 font-medium px-2 py-1 rounded text-xs sm:text-sm border border-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-400 cursor-pointer w-full max-w-[160px]"
                            >
                              <option value="">Vazio</option>
                              {availableWomen.map(w => (
                                <option key={w.id} value={w.id}> {w.name}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
    </>
  );
}
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
  sundayIndex: number;
}

interface SundayDate {
  date: Date;
  dateString: string;
  sundayIndex: number;
}

interface Assignment {
  sunday: SundayDate;
  scheduleTime: '16:30 - 20:30' | '15:00 - 20:30';
  assignedMan: Employee | null;
  assignedWoman: Employee | null;
}

export default function Home() {
  // Lista oficial de funcionários
  const [employees, setEmployees] = useState<Employee[]>([
    // Irmãos
    { id: 'joao-paulo', name: 'Joao Paulo', gender: 'M' },
    { id: 'jair', name: 'Jair', gender: 'M' },
    { id: 'sergio', name: 'Sergio', gender: 'M' },
    // Mulheres
    { id: 'neuza', name: 'Neuza', gender: 'F' },
    { id: 'claudia', name: 'Claudia', gender: 'F' },
    { id: 'dayane', name: 'Dayane', gender: 'F' },
    { id: 'tatiane', name: 'Tatiane', gender: 'F' },
    { id: 'terezinha', name: 'Terezinha', gender: 'F' },
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

  // Auxiliar: Busca domingos do mês (Modificado para exibir apenas a data)
  const getSundaysInMonth = (year: number, month: number): SundayDate[] => {
    const sundays: SundayDate[] = [];
    const date = new Date(year, month, 1);

    while (date.getDay() !== 0) {
      date.setDate(date.getDate() + 1);
    }

    let sundayCount = 1;
    while (date.getMonth() === month) {
      sundays.push({
        date: new Date(date),
        // Removido o 'weekday: long' para trazer apenas o dia e o mês curto (Ex: "7 de jun.")
        dateString: date.toLocaleDateString('pt-BR', {
          day: 'numeric',
          month: 'short',
        }),
        sundayIndex: sundayCount,
      });
      sundayCount++;
      date.setDate(date.getDate() + 7);
    }
    return sundays;
  };

  // Lógica de Sorteio Automático Inicial
  const generateSchedule = () => {
    const sundays = getSundaysInMonth(selectedYear, selectedMonth);
    let lastAssignedWomanId: string | null = null;

    const configuredCouples = employees
      .filter(emp => emp.gender === 'M' && emp.partnerId)
      .map(man => {
        const woman = employees.find(emp => emp.id === man.partnerId && emp.gender === 'F');
        if (!woman) return null;
        return { man, woman };
      })
      .filter((pair): pair is { man: Employee; woman: Employee } => pair !== null);

    const newSchedule: Assignment[] = sundays.map((sunday) => {
      const isUnavailable = (empId: string) =>
        unavailabilities.some(u => u.employeeId === empId && u.sundayIndex === sunday.sundayIndex);

      const availableMen = employees.filter(emp => emp.gender === 'M' && !isUnavailable(emp.id));
      const availableWomen = employees.filter(emp => emp.gender === 'F' && !isUnavailable(emp.id));

      let chosenMan: Employee | null = null;
      let chosenWoman: Employee | null = null;

      const availableCouples = configuredCouples.filter(({ man, woman }) =>
        !isUnavailable(man.id) && !isUnavailable(woman.id)
      );

      if (availableCouples.length > 0) {
        const preferredCouples = lastAssignedWomanId
          ? availableCouples.filter(pair => pair.woman.id !== lastAssignedWomanId)
          : availableCouples;

        const selectedCouple = (preferredCouples.length > 0 ? preferredCouples : availableCouples)[
          Math.floor(Math.random() * (preferredCouples.length > 0 ? preferredCouples.length : availableCouples.length))
        ];

        chosenMan = selectedCouple.man;
        chosenWoman = selectedCouple.woman;
      } else {
        const man = availableMen.length > 0
          ? availableMen[Math.floor(Math.random() * availableMen.length)]
          : null;

        let femalePool = [...availableWomen];

        if (lastAssignedWomanId) {
          const filteredNonConsecutive = femalePool.filter(w => w.id !== lastAssignedWomanId);
          if (filteredNonConsecutive.length > 0) {
            femalePool = filteredNonConsecutive;
          }
        }

        if (femalePool.length > 0) {
          const idxW = Math.floor(Math.random() * femalePool.length);
          chosenWoman = femalePool[idxW];
        }

        chosenMan = man;
      }

      lastAssignedWomanId = chosenWoman ? chosenWoman.id : null;

      return {
        sunday,
        scheduleTime: '16:30 - 20:30',
        assignedMan: chosenMan,
        assignedWoman: chosenWoman,
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
    scheduleTime: '16:30 - 20:30' | '15:00 - 20:30'
  ) => {
    const updatedSchedule = [...schedule];
    updatedSchedule[index].scheduleTime = scheduleTime;
    setSchedule(updatedSchedule);
  };

  const handleExportSchedule = () => {
    const rows = [
      ['Data', 'Ocorrência', 'Horário Abertura/Fechamento', 'Irmão', 'Irmã'],
      ...schedule.map(item => [
        item.sunday.dateString,
        `${item.sunday.sundayIndex}º Domingo`,
        item.scheduleTime,
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

    const rowsHtml = schedule.map((item) => {
      const currentSundayIndex = item.sunday.sundayIndex;
      const timeLabel = item.scheduleTime === '15:00 - 20:30'
        ? `Ensaio e Culto • ${item.scheduleTime}`
        : `Culto • ${item.scheduleTime}`;
      return `
        <tr>
          <td>${item.sunday.dateString}</td>
          <td>${currentSundayIndex}º Domingo</td>
          <td>${timeLabel}</td>
          <td>${item.assignedMan?.name || '-'}</td>
          <td>${item.assignedWoman?.name || '-'}</td>
        </tr>
      `;
    }).join('');

    const monthName = new Date(selectedYear, selectedMonth).toLocaleString('pt-BR', { month: 'long' });
    const monthLabel = `${monthName} - ${selectedYear}`;

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Escala dos Auxiliares da Porta - Liverpool</title>
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
            <h1>Escala dos Auxiliares da Porta - Liverpool</h1>
            <h2 style="text-align:center; font-size:16px; margin:6px 0 14px; text-transform: capitalize;">${monthLabel}</h2>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Ocorrência</th>
                  <th>Horário Abertura/Fechamento</th>
                  <th>Irmão</th>
                  <th>Irmã</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || '<tr><td colspan="5">Sem escala gerada.</td></tr>'}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  const toggleUnavailability = (employeeId: string, sundayIndex: number) => {
    setUnavailabilities((prev) => {
      const exists = prev.some(u => u.employeeId === employeeId && u.sundayIndex === sundayIndex);
      if (exists) {
        return prev.filter(u => !(u.employeeId === employeeId && u.sundayIndex === sundayIndex));
      } else {
        return [...prev, { employeeId, sundayIndex }];
      }
    });
  };



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
        📅 Escala dos Cultos (1 Irmão & 1 Irmã)
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

      {/* Matriz de Indisponibilidade */}
      <div className="print-hidden bg-white p-3 sm:p-6 rounded-xl shadow-sm mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-3">Definir Indisponibilidades</h2>
        <div className="overflow-x-auto -mx-2 sm:mx-0 pb-2">
          <table className="w-full min-w-[880px] text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="p-2 sm:p-3 text-[11px] sm:text-sm font-semibold text-gray-600">Irmãos/Irmãs</th>
                <th className="p-2 sm:p-3 text-[11px] sm:text-sm font-semibold text-gray-600 text-center">Gênero</th>
                <th className="p-2 sm:p-3 text-[11px] sm:text-sm font-semibold text-gray-600 text-center">Casal</th>

                {[1, 2, 3, 4, 5].map((num) => (
                  <th key={num} className="p-2 sm:p-3 text-[11px] sm:text-sm font-semibold text-gray-600 text-center">{num}º Dom</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50 group align-top">
                  <td className="p-2 sm:p-3 font-medium text-gray-800 min-w-[160px]">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <span className="break-words">{emp.name}</span>
                      <button onClick={() => handleRemoveEmployee(emp.id)} className="text-red-500 hover:text-red-700 text-[10px] sm:text-xs font-medium bg-red-50 px-2 py-1 rounded self-start sm:self-auto">
                        Remover
                      </button>
                    </div>
                  </td>
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
                        .filter(other => other.id !== emp.id && other.gender !== emp.gender)
                        .map(other => (
                          <option key={other.id} value={other.id}>{other.name}</option>
                        ))}
                    </select>
                  </td>
                  {[1, 2, 3, 4, 5].map((num) => {
                    const isChecked = unavailabilities.some(u => u.employeeId === emp.id && u.sundayIndex === num);
                    return (
                      <td key={num} className="p-2 sm:p-3 text-center">
                        <input type="checkbox" checked={isChecked} onChange={() => toggleUnavailability(emp.id, num)} className="h-4 w-4 text-blue-600 rounded border-gray-300 cursor-pointer" />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
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
          <h2 className="text-lg sm:text-xl font-semibold text-gray-700">Escala dos Auxiliares da Porta - Liverpool</h2>
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
        <div className="overflow-x-auto -mx-2 sm:mx-0 pb-2">
          <table className="w-full min-w-[820px] text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200 bg-gray-100">
                <th className="p-2 sm:p-3 text-[11px] sm:text-sm font-semibold text-gray-700">Data</th>
                <th className="p-2 sm:p-3 text-[11px] sm:text-sm font-semibold text-gray-700">Ocorrência</th>
                <th className="p-2 sm:p-3 text-[11px] sm:text-sm font-semibold text-gray-700">Horário Abertura/Fechamento</th>
                <th className="p-2 sm:p-3 text-[11px] sm:text-sm font-semibold text-gray-700">Irmão</th>
                <th className="p-2 sm:p-3 text-[11px] sm:text-sm font-semibold text-gray-700">Irmã</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((item, idx) => {
                const currentSundayIndex = item.sunday.sundayIndex;

                const isUnavailable = (empId: string) =>
                  unavailabilities.some(u => u.employeeId === empId && u.sundayIndex === currentSundayIndex);

                const availableMen = employees.filter(emp => emp.gender === 'M' && !isUnavailable(emp.id));
                const availableWomen = employees.filter(emp => emp.gender === 'F' && !isUnavailable(emp.id));

                return (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors align-top">
                    <td className="p-2 sm:p-3 font-medium text-gray-800 capitalize text-sm">{item.sunday.dateString}</td>
                    <td className="p-2 sm:p-3 text-xs sm:text-sm text-gray-500">{currentSundayIndex}º Domingo</td>
                    <td className="p-2 sm:p-3">
                      <select
                        value={item.scheduleTime}
                        onChange={(e) => handleScheduleTimeChange(idx, e.target.value as '16:30 - 20:30' | '15:00 - 20:30')}
                        className={item.scheduleTime === '15:00 - 20:30'
                          ? 'bg-yellow-50 text-yellow-800 font-medium px-2 py-1 rounded text-xs sm:text-sm border border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 cursor-pointer w-full max-w-[220px]'
                          : 'bg-gray-50 text-gray-800 font-medium px-2 py-1 rounded text-xs sm:text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 cursor-pointer w-full max-w-[220px]'}
                      >
                        <option value="15:00 - 20:30">🎵 Ensaio — 15:00 - 20:30</option>
                        <option value="16:30 - 20:30">🕒 Normal — 16:30 - 20:30</option>
                      </select>
                    </td>

                    <td className="p-2 sm:p-3">
                      <select
                        value={item.assignedMan?.id || ''}
                        onChange={(e) => handleManualOverride(idx, 'assignedMan', e.target.value)}
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
                        onChange={(e) => handleManualOverride(idx, 'assignedWoman', e.target.value)}
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
    </div>
    </>
  );
}
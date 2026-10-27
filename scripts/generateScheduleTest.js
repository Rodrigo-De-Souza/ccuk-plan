// Deterministic scheduler test script
// Run with: node scripts/generateScheduleTest.js

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function getWeeklyOccurrencesInMonth(year, month) {
  const occurrences = [];
  const counts = { quarta:0, sabado:0, domingo:0 };
  const date = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  for (let current = new Date(date); current <= lastDay; current.setDate(current.getDate() + 1)) {
    const dayNumber = current.getDay();
    const normalizedDay = dayNumber === 3 ? 'quarta' : dayNumber === 6 ? 'sabado' : dayNumber === 0 ? 'domingo' : null;
    if (!normalizedDay) continue;
    counts[normalizedDay] += 1;
    const dayName = normalizedDay === 'quarta' ? 'Quarta-Feira' : normalizedDay === 'sabado' ? 'Sábado' : 'Domingo';
    occurrences.push({
      date: new Date(current),
      dateString: current.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }),
      occurrenceKey: `${normalizedDay}-${counts[normalizedDay]}`,
      dayName,
      occurrenceIndex: counts[normalizedDay],
    });
  }
  return occurrences;
}

function generateSchedule({ employees, unavailabilities, year, month, seed = 12345 }) {
  const rng = mulberry32(seed);
  const weeklyOccurrences = getWeeklyOccurrencesInMonth(year, month);
  let lastAssignedWomanId = null;
  let lastAssignedManId = null;

  const configuredCouples = employees
    .filter(emp => emp.gender === 'M' && emp.partnerId)
    .map(man => {
      const woman = employees.find(emp => emp.id === man.partnerId && emp.gender === 'F');
      if (!woman) return null;
      return { man, woman };
    })
    .filter(pair => pair !== null);

  return weeklyOccurrences.map((occurrence) => {
    const isUnavailable = (empId) => unavailabilities.some(u => u.employeeId === empId && u.occurrenceKey === occurrence.occurrenceKey);

    const availableMen = employees.filter(emp => emp.gender === 'M' && !isUnavailable(emp.id));
    const availableWomen = employees.filter(emp => emp.gender === 'F' && !isUnavailable(emp.id));

    let chosenMan = null;
    let chosenWoman = null;

    const availableCouples = configuredCouples.filter(({ man, woman }) => !isUnavailable(man.id) && !isUnavailable(woman.id));

    if (availableCouples.length > 0) {
      const preferredCouples = availableCouples.filter(pair => pair.woman.id !== lastAssignedWomanId && pair.man.id !== lastAssignedManId);
      const preferredByWoman = availableCouples.filter(pair => pair.woman.id !== lastAssignedWomanId);
      const preferredByMan = availableCouples.filter(pair => pair.man.id !== lastAssignedManId);

      let pool = preferredCouples.length > 0 ? preferredCouples
        : (preferredByWoman.length > 0 ? preferredByWoman
          : (preferredByMan.length > 0 ? preferredByMan : availableCouples));

      const selectedCouple = pool[Math.floor(rng() * pool.length)];
      chosenMan = selectedCouple.man;
      chosenWoman = selectedCouple.woman;
    } else {
      let malePool = [...availableMen];
      if (lastAssignedManId) {
        const filteredNonConsecutive = malePool.filter(m => m.id !== lastAssignedManId);
        if (filteredNonConsecutive.length > 0) malePool = filteredNonConsecutive;
      }
      const man = malePool.length > 0 ? malePool[Math.floor(rng() * malePool.length)] : null;

      let femalePool = [...availableWomen];
      if (lastAssignedWomanId) {
        const filteredNonConsecutive = femalePool.filter(w => w.id !== lastAssignedWomanId);
        if (filteredNonConsecutive.length > 0) femalePool = filteredNonConsecutive;
      }
      const woman = femalePool.length > 0 ? femalePool[Math.floor(rng() * femalePool.length)] : null;

      chosenMan = man;
      chosenWoman = woman;
    }

    // Post-selection strict: if chosen repeats last assigned, pick alternative if exists, otherwise leave empty
    if (chosenMan && chosenMan.id === lastAssignedManId) {
      const altMen = employees.filter(emp => emp.gender === 'M' && emp.id !== lastAssignedManId && !unavailabilities.some(u => u.employeeId === emp.id && u.occurrenceKey === occurrence.occurrenceKey));
      if (altMen.length > 0) chosenMan = altMen[Math.floor(rng() * altMen.length)];
      else chosenMan = null;
    }

    if (chosenWoman && chosenWoman.id === lastAssignedWomanId) {
      const altWomen = employees.filter(emp => emp.gender === 'F' && emp.id !== lastAssignedWomanId && !unavailabilities.some(u => u.employeeId === emp.id && u.occurrenceKey === occurrence.occurrenceKey));
      if (altWomen.length > 0) chosenWoman = altWomen[Math.floor(rng() * altWomen.length)];
      else chosenWoman = null;
    }

    lastAssignedWomanId = chosenWoman ? chosenWoman.id : null;
    lastAssignedManId = chosenMan ? chosenMan.id : null;

    return { occurrence, chosenManId: chosenMan?.id ?? null, chosenWomanId: chosenWoman?.id ?? null };
  });
}

// Sample data
const employees = [
  { id: 'andre', name: 'Andre', gender: 'M' },
  { id: 'giovanni', name: 'Giovanni', gender: 'M' },
  { id: 'josue', name: 'Josué', gender: 'M' },
  { id: 'marcos', name: 'Marcos', gender: 'M' },
  { id: 'mauricio', name: 'Mauricio', gender: 'M' },
  { id: 'renato', name: 'Renato', gender: 'M' },
  { id: 'ronaldo', name: 'Ronaldo', gender: 'M' },
  { id: 'alana', name: 'Alana', gender: 'F' },
  { id: 'debora', name: 'Debora', gender: 'F' },
  { id: 'elaine', name: 'Elaine', gender: 'F' },
  { id: 'jucilene', name: 'Jucilene', gender: 'F' },
];

// couple example: set Andre partnered with Alana
employees.find(e => e.id === 'andre').partnerId = 'alana';

const unavailabilities = []; // none

const year = 2026;
const month = new Date().getMonth();

const schedule = generateSchedule({ employees, unavailabilities, year, month, seed: 42 });

console.log('Generated schedule:');
for (const s of schedule) {
  console.log(`${s.occurrence.dateString} (${s.occurrence.occurrenceKey}) -> Man: ${s.chosenManId} | Woman: ${s.chosenWomanId}`);
}

// Check for consecutive repeats
let manRepeat = false;
let womanRepeat = false;
for (let i = 1; i < schedule.length; i++) {
  if (schedule[i].chosenManId && schedule[i-1].chosenManId && schedule[i].chosenManId === schedule[i-1].chosenManId) manRepeat = true;
  if (schedule[i].chosenWomanId && schedule[i-1].chosenWomanId && schedule[i].chosenWomanId === schedule[i-1].chosenWomanId) womanRepeat = true;
}

console.log('\nConsecutive man repeats detected:', manRepeat);
console.log('Consecutive woman repeats detected:', womanRepeat);

if (!manRepeat && !womanRepeat) {
  console.log('\nTest PASS: No consecutive repeats when alternatives exist.');
} else {
  console.log('\nTest FAIL: Consecutive repeats found.');
}

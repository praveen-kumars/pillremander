# Health Logging System Usage Examples

## 🏥 **How to Use the Health Logs Database**

The health logging system tracks:
1. **Medication Logs** - When pills are taken/skipped/missed
2. **Side Effect Logs** - User-reported symptoms with date/time
3. **Daily Summaries** - Aggregated daily health data
4. **Adherence Analytics** - Medication compliance statistics

## 📝 **1. Logging Medication Events**

### When User Takes a Pill:
```typescript
import { healthLogsService, HealthLogsService } from '@/services/healthLogsService';

// User took their morning medication
await healthLogsService.logMedicationTaken({
  medicationId: 1,
  medicationName: "Lisinopril",
  dosage: "10mg",
  scheduledTime: "2025-07-29T08:00:00.000Z", // When they should have taken it
  actualTime: "2025-07-29T08:15:00.000Z",   // When they actually took it
  status: "taken",
  notes: "Took with breakfast",
  location: "Home"
});
```

### When User Skips a Pill:
```typescript
await healthLogsService.logMedicationTaken({
  medicationId: 1,
  medicationName: "Lisinopril",
  dosage: "10mg",
  scheduledTime: "2025-07-29T20:00:00.000Z",
  status: "skipped",
  notes: "Forgot to bring pills to dinner"
});
```

### When User Misses a Pill (System detected):
```typescript
await healthLogsService.logMedicationTaken({
  medicationId: 1,
  medicationName: "Lisinopril",
  dosage: "10mg",
  scheduledTime: "2025-07-29T08:00:00.000Z",
  status: "missed",
  notes: "Reminder not acknowledged within 2 hours"
});
```

## 🚨 **2. Logging Side Effects**

### User Reports a Side Effect:
```typescript
await healthLogsService.logSideEffect({
  medicationId: 1,
  medicationName: "Lisinopril",
  symptom: "Dizziness",
  severity: "mild",
  description: "Felt lightheaded when standing up quickly",
  duration: "15 minutes",
  startTime: "2025-07-29T10:30:00.000Z",
  endTime: "2025-07-29T10:45:00.000Z",
  reportedTime: "2025-07-29T11:00:00.000Z", // When they logged it
  actionTaken: "Sat down and drank water",
  contactedDoctor: false
});
```

### Severe Side Effect (Contact Doctor):
```typescript
await healthLogsService.logSideEffect({
  medicationId: 2,
  medicationName: "Metformin",
  symptom: "Severe nausea",
  severity: "severe",
  description: "Persistent nausea and vomiting for 3 hours",
  duration: "3 hours",
  startTime: "2025-07-29T14:00:00.000Z",
  reportedTime: "2025-07-29T17:00:00.000Z",
  actionTaken: "Stopped taking medication, called doctor",
  contactedDoctor: true
});
```

## 📊 **3. Retrieving Data for Specific Dates**

### Get All Medication Events for Today:
```typescript
const today = HealthLogsService.formatDate(new Date());
const todayLogs = await healthLogsService.getMedicationLogsForDate(today);

console.log("Today's medication events:", todayLogs);
// Returns: [{ medicationName: "Lisinopril", status: "taken", scheduledTime: "..." }, ...]
```

### Get Side Effects for a Specific Date:
```typescript
const yesterday = HealthLogsService.formatDate(new Date(Date.now() - 24*60*60*1000));
const sideEffects = await healthLogsService.getSideEffectsForDate(yesterday);

console.log("Yesterday's side effects:", sideEffects);
```

### Get Weekly Medication History:
```typescript
const startDate = "2025-07-22"; // Monday
const endDate = "2025-07-28";   // Sunday

const weeklyLogs = await healthLogsService.getMedicationLogsForDateRange(startDate, endDate);
console.log("Week's medication history:", weeklyLogs);
```

## 📈 **4. Analytics and Adherence**

### Get Adherence Statistics:
```typescript
const stats = await healthLogsService.getAdherenceStats("2025-07-01", "2025-07-31");

console.log(`Adherence: ${stats.adherencePercentage}%`);
console.log(`Taken: ${stats.takenDoses}/${stats.totalDoses}`);
console.log(`Skipped: ${stats.skippedDoses}`);
console.log(`Missed: ${stats.missedDoses}`);
```

### Get Daily Summary:
```typescript
const summary = await healthLogsService.getDailySummary("2025-07-29");

if (summary) {
  console.log(`Total medications: ${summary.totalMedications}`);
  console.log(`Medications taken: ${summary.medicationsTaken}`);
  console.log(`Side effects reported: ${summary.sideEffectsReported}`);
}
```

### Get Weekly Summary:
```typescript
const weeklySummary = await healthLogsService.getWeeklySummary("2025-07-22");
weeklySummary.forEach(day => {
  console.log(`${day.date}: ${day.medicationsTaken}/${day.totalMedications} taken`);
});
```

## 🔍 **5. Filtering Side Effects by Medication**

### Find All Side Effects for a Specific Medication:
```typescript
const lisinoprilSideEffects = await healthLogsService.getSideEffectsByMedication(1);

// Analyze patterns
const severeSideEffects = lisinoprilSideEffects.filter(se => se.severity === 'severe');
console.log(`Severe side effects for Lisinopril: ${severeSideEffects.length}`);
```

## 📤 **6. Data Export for Doctor Visits**

### Export All Data for Last 30 Days:
```typescript
const endDate = new Date();
const startDate = new Date();
startDate.setDate(endDate.getDate() - 30);

const exportData = await healthLogsService.exportLogsForDateRange(
  HealthLogsService.formatDate(startDate),
  HealthLogsService.formatDate(endDate)
);

// Share with doctor
console.log("Medication logs:", exportData.medicationLogs);
console.log("Side effects:", exportData.sideEffects);
console.log("Daily summaries:", exportData.dailySummaries);
```

## 🎯 **Integration with UI Components**

### In a Daily Log Screen:
```typescript
const DailyLogScreen = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [medicationLogs, setMedicationLogs] = useState([]);
  const [sideEffects, setSideEffects] = useState([]);

  useEffect(() => {
    const loadDayData = async () => {
      const dateStr = HealthLogsService.formatDate(selectedDate);
      const logs = await healthLogsService.getMedicationLogsForDate(dateStr);
      const effects = await healthLogsService.getSideEffectsForDate(dateStr);
      
      setMedicationLogs(logs);
      setSideEffects(effects);
    };

    loadDayData();
  }, [selectedDate]);

  // Render logs for selected date...
};
```

## 💾 **Database Files Created:**

1. **`pillRemainderUserData.db`** - User profiles, medical info, contacts
2. **`pillRemainderLogs.db`** - Medication logs, side effects, daily summaries

This system provides comprehensive tracking of medication adherence and side effects with precise date/time logging for better healthcare management.

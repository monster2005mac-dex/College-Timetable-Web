import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

export interface ClassEntry {
  id: string;
  subject: string;
  room: string;
  teacher: string;
  day: number;
  startMin: number;
  endMin: number;
  colorIndex: number;
  dateIso?: string;
  overrideOfId?: string;
  isCancelled?: boolean;
}

export interface AttendanceRecord {
  subject: string;
  attended: number;
  missed: number;
  totalConducted: number;
  percentage: number;
}

export interface ExamEntry {
  id: string;
  title: string;
  subject: string;
  dateIso: string;
  priority: string;
}

export interface UserProfile {
  displayName?: string;
  profileDriveUrl?: string;
  profileImageUrl?: string;
}

export function subscribeUserProfile(userId: string, onUpdate: (profile: UserProfile) => void) {
  const profileRef = doc(db, "users", userId, "profile", "details");
  return onSnapshot(profileRef, (snapshot) => {
    onUpdate(snapshot.exists() ? snapshot.data() as UserProfile : {});
  });
}

export async function saveUserProfile(userId: string, profile: UserProfile) {
  const profileRef = doc(db, "users", userId, "profile", "details");
  await setDoc(profileRef, profile, { merge: true });
}

export async function getUserDataExport(userId: string) {
  const userCollection = (name: string) => collection(db, "users", userId, name);
  const [profileSnapshot, entriesSnapshot, attendanceSnapshot, examsSnapshot] = await Promise.all([
    getDoc(doc(db, "users", userId, "profile", "details")),
    getDocs(userCollection("entries")),
    getDocs(userCollection("attendance")),
    getDocs(userCollection("exams")),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    profile: profileSnapshot.exists() ? profileSnapshot.data() : {},
    schedule: entriesSnapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id })),
    attendance: attendanceSnapshot.docs.map((record) => ({ ...record.data(), id: record.id })),
    exams: examsSnapshot.docs.map((exam) => ({ ...exam.data(), id: exam.id })),
  };
}

export async function clearUserFirestoreData(userId: string) {
  const userPath = ["users", userId] as const;
  const collectionNames = ["entries", "attendance", "exams", "profile"] as const;

  for (const collectionName of collectionNames) {
    const snapshot = await getDocs(collection(db, ...userPath, collectionName));
    for (let offset = 0; offset < snapshot.docs.length; offset += 450) {
      const batch = writeBatch(db);
      snapshot.docs.slice(offset, offset + 450).forEach((userDocument) => {
        batch.delete(userDocument.ref);
      });
      await batch.commit();
    }
  }

  await deleteDoc(doc(db, ...userPath));
}

// Real-time Class Entries listener
export function subscribeEntries(
  userId: string,
  onUpdate: (entries: ClassEntry[]) => void
) {
  const colRef = collection(db, "users", userId, "entries");
  return onSnapshot(colRef, (snapshot) => {
    const list: ClassEntry[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as ClassEntry);
    });
    onUpdate(list);
  });
}

// Save Class Entry
export async function saveEntry(userId: string, entry: ClassEntry) {
  const docRef = doc(db, "users", userId, "entries", entry.id);
  await setDoc(docRef, entry);
}

// Delete Class Entry
export async function deleteEntry(userId: string, entryId: string) {
  const docRef = doc(db, "users", userId, "entries", entryId);
  await deleteDoc(docRef);
}

// Real-time Attendance listener
export function subscribeAttendance(
  userId: string,
  onUpdate: (records: Record<string, AttendanceRecord>) => void
) {
  const colRef = collection(db, "users", userId, "attendance");
  return onSnapshot(colRef, (snapshot) => {
    const map: Record<string, AttendanceRecord> = {};
    snapshot.forEach((d) => {
      map[d.id] = d.data() as AttendanceRecord;
    });
    onUpdate(map);
  });
}

// Save Attendance Record
export async function saveAttendanceRecord(
  userId: string,
  record: AttendanceRecord
) {
  const docRef = doc(db, "users", userId, "attendance", record.subject);
  await setDoc(docRef, record);
}

// Real-time Exams listener
export function subscribeExams(
  userId: string,
  onUpdate: (exams: ExamEntry[]) => void
) {
  const colRef = collection(db, "users", userId, "exams");
  return onSnapshot(colRef, (snapshot) => {
    const list: ExamEntry[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as ExamEntry);
    });
    onUpdate(list);
  });
}

// Save Exam Entry
export async function saveExamEntry(userId: string, exam: ExamEntry) {
  const docRef = doc(db, "users", userId, "exams", exam.id);
  await setDoc(docRef, exam);
}

// Delete Exam Entry
export async function deleteExamEntry(userId: string, examId: string) {
  const docRef = doc(db, "users", userId, "exams", examId);
  await deleteDoc(docRef);
}

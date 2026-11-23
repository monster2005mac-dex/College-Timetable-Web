package com.example.collegetimetable

import android.content.Context
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.DocumentReference
import com.google.firebase.firestore.FirebaseFirestore

object FirestoreSyncManager {

    private val auth: FirebaseAuth by lazy { FirebaseAuth.getInstance() }
    private val db: FirebaseFirestore by lazy { FirebaseFirestore.getInstance() }

    fun clearCurrentUserData(onComplete: (Exception?) -> Unit) {
        val user = auth.currentUser
        if (user == null) {
            onComplete(null)
            return
        }

        val userDocument = db.collection("users").document(user.uid)
        val collectionNames = listOf("entries", "attendance", "exams", "profile")
        val documents = mutableListOf<DocumentReference>()

        fun deleteBatch(offset: Int) {
            if (offset >= documents.size) {
                onComplete(null)
                return
            }

            val batch = db.batch()
            val nextOffset = minOf(offset + 450, documents.size)
            documents.subList(offset, nextOffset).forEach { document -> batch.delete(document) }
            batch.commit()
                .addOnSuccessListener { deleteBatch(nextOffset) }
                .addOnFailureListener(onComplete)
        }

        fun readCollection(index: Int) {
            if (index >= collectionNames.size) {
                documents.add(userDocument)
                deleteBatch(0)
                return
            }

            userDocument.collection(collectionNames[index]).get()
                .addOnSuccessListener { snapshot ->
                    documents.addAll(snapshot.documents.map { it.reference })
                    readCollection(index + 1)
                }
                .addOnFailureListener(onComplete)
        }

        readCollection(0)
    }

    fun syncEntriesToCloud(context: Context, entry: ClassEntry) {
        val user = auth.currentUser ?: return
        val map = mapOf(
            "id" to entry.id,
            "subject" to entry.subject,
            "room" to entry.room,
            "teacher" to entry.teacher,
            "day" to entry.day,
            "startMin" to entry.startMin,
            "endMin" to entry.endMin,
            "colorIndex" to entry.colorIndex,
            "dateIso" to entry.dateIso,
            "overrideOfId" to entry.overrideOfId,
            "isCancelled" to entry.isCancelled
        )
        db.collection("users").document(user.uid)
            .collection("entries").document(entry.id)
            .set(map)
    }

    fun deleteEntryFromCloud(entryId: String) {
        val user = auth.currentUser ?: return
        db.collection("users").document(user.uid)
            .collection("entries").document(entryId)
            .delete()
    }

    fun syncAttendanceToCloud(record: AttendanceRecord) {
        val user = auth.currentUser ?: return
        val map = mapOf(
            "subject" to record.subject,
            "attended" to record.attended,
            "missed" to record.missed,
            "totalConducted" to record.totalConducted,
            "percentage" to record.percentage
        )
        db.collection("users").document(user.uid)
            .collection("attendance").document(record.subject)
            .set(map)
    }

    fun syncExamToCloud(exam: ExamEntry) {
        val user = auth.currentUser ?: return
        val map = mapOf(
            "id" to exam.id,
            "title" to exam.title,
            "subject" to exam.subject,
            "dateIso" to exam.dateIso,
            "priority" to exam.priority.name
        )
        db.collection("users").document(user.uid)
            .collection("exams").document(exam.id)
            .set(map)
    }

    fun deleteExamFromCloud(examId: String) {
        val user = auth.currentUser ?: return
        db.collection("users").document(user.uid)
            .collection("exams").document(examId)
            .delete()
    }

    fun startRealtimeSync(
        context: Context,
        onEntriesUpdated: (List<ClassEntry>) -> Unit,
        onAttendanceUpdated: (Map<String, AttendanceRecord>) -> Unit,
        onExamsUpdated: (List<ExamEntry>) -> Unit
    ) {
        val user = auth.currentUser ?: return

        // 1. Entries Realtime Listener
        db.collection("users").document(user.uid)
            .collection("entries")
            .addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null) return@addSnapshotListener
                val list = snapshot.documents.mapNotNull { doc ->
                    val id = doc.getString("id") ?: doc.id
                    val subject = doc.getString("subject") ?: return@mapNotNull null
                    val room = doc.getString("room") ?: ""
                    val teacher = doc.getString("teacher") ?: ""
                    val day = doc.getLong("day")?.toInt() ?: 1
                    val startMin = doc.getLong("startMin")?.toInt() ?: 540
                    val endMin = doc.getLong("endMin")?.toInt() ?: 600
                    val colorIndex = doc.getLong("colorIndex")?.toInt() ?: 0
                    val dateIso = doc.getString("dateIso")
                    val overrideOfId = doc.getString("overrideOfId")
                    val isCancelled = doc.getBoolean("isCancelled") ?: false

                    ClassEntry(
                        id = id,
                        subject = subject,
                        room = room,
                        teacher = teacher,
                        day = day,
                        startMin = startMin,
                        endMin = endMin,
                        colorIndex = colorIndex,
                        dateIso = dateIso,
                        overrideOfId = overrideOfId,
                        isCancelled = isCancelled
                    )
                }
                onEntriesUpdated(list)
            }

        // 2. Attendance Realtime Listener
        db.collection("users").document(user.uid)
            .collection("attendance")
            .addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null) return@addSnapshotListener
                val map = mutableMapOf<String, AttendanceRecord>()
                snapshot.documents.forEach { doc ->
                    val subject = doc.getString("subject") ?: doc.id
                    val attended = doc.getLong("attended")?.toInt() ?: 0
                    val missed = doc.getLong("missed")?.toInt() ?: 0

                    map[subject] = AttendanceRecord(
                        subject = subject,
                        attended = attended,
                        missed = missed
                    )
                }
                onAttendanceUpdated(map)
            }

        // 3. Exams Realtime Listener
        db.collection("users").document(user.uid)
            .collection("exams")
            .addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null) return@addSnapshotListener
                val list = snapshot.documents.mapNotNull { doc ->
                    val id = doc.getString("id") ?: doc.id
                    val title = doc.getString("title") ?: return@mapNotNull null
                    val subject = doc.getString("subject") ?: ""
                    val dateIso = doc.getString("dateIso") ?: ""
                    val priorityStr = doc.getString("priority") ?: "MEDIUM"
                    val priority = try { ExamPriority.valueOf(priorityStr) } catch (_: Exception) { ExamPriority.MEDIUM }

                    ExamEntry(
                        id = id,
                        title = title,
                        subject = subject,
                        dateIso = dateIso,
                        priority = priority
                    )
                }
                onExamsUpdated(list)
            }
    }
}

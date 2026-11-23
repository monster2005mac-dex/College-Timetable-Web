package com.example.collegetimetable

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/** Stores the timetable on the device as JSON in SharedPreferences. */
class TimetableRepository(context: Context) {

    private val prefs = context.getSharedPreferences("timetable", Context.MODE_PRIVATE)

    fun load(): List<ClassEntry> {
        val raw = prefs.getString(KEY, null) ?: return emptyList()
        return try {
            val arr = JSONArray(raw)
            (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                ClassEntry(
                    id = o.getString("id"),
                    subject = o.getString("subject"),
                    room = o.optString("room"),
                    teacher = o.optString("teacher"),
                    day = o.getInt("day"),
                    startMin = o.getInt("startMin"),
                    endMin = o.getInt("endMin"),
                    colorIndex = o.optInt("colorIndex", 0),
                    dateIso = o.optString("dateIso").takeIf { o.has("dateIso") && !o.isNull("dateIso") },
                    overrideOfId = o.optString("overrideOfId").takeIf { o.has("overrideOfId") && !o.isNull("overrideOfId") },
                    isCancelled = o.optBoolean("isCancelled", false)
                )
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun save(list: List<ClassEntry>) {
        val arr = JSONArray()
        list.forEach { e ->
            arr.put(
                JSONObject()
                    .put("id", e.id)
                    .put("subject", e.subject)
                    .put("room", e.room)
                    .put("teacher", e.teacher)
                    .put("day", e.day)
                    .put("startMin", e.startMin)
                    .put("endMin", e.endMin)
                    .put("colorIndex", e.colorIndex)
                    .put("dateIso", e.dateIso)
                    .put("overrideOfId", e.overrideOfId)
                    .put("isCancelled", e.isCancelled)
            )
        }
        prefs.edit().putString(KEY, arr.toString()).apply()
    }

    fun clearAll() {
        prefs.edit().clear().apply()
    }

    private companion object {
        const val KEY = "entries"
    }
}

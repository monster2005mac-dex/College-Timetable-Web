package com.example.collegetimetable

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class TimetableViewModel(app: Application) : AndroidViewModel(app) {

    private val repo = TimetableRepository(app)
    private val _entries = MutableStateFlow(repo.load())
    val entries: StateFlow<List<ClassEntry>> = _entries.asStateFlow()

    /** Returns another class on the same day whose time overlaps the candidate, if any. */
    fun findConflict(candidate: ClassEntry): ClassEntry? {
        val possibleConflicts = candidate.dateIso?.let { dateIso ->
            runCatching { java.time.LocalDate.parse(dateIso) }
                .getOrNull()
                ?.let { date -> entriesForDate(_entries.value, date) }
                .orEmpty()
        } ?: _entries.value.filter {
            it.dateIso == null && it.day == candidate.day && !it.isCancelled
        }

        return possibleConflicts.firstOrNull { existing ->
            existing.id != candidate.id &&
                existing.id != candidate.overrideOfId &&
                candidate.startMin < existing.endMin &&
                existing.startMin < candidate.endMin
        }
    }

    fun upsert(entry: ClassEntry) {
        val list = _entries.value.toMutableList()
        val index = list.indexOfFirst { it.id == entry.id }
        if (index >= 0) list[index] = entry else list.add(entry)
        commit(list)
    }

    fun delete(id: String) {
        commit(_entries.value.filterNot { it.id == id })
    }

    fun clearAll() {
        repo.clearAll()
        _entries.value = emptyList()
    }

    private fun commit(list: List<ClassEntry>) {
        _entries.value = list
        repo.save(list)
    }
}

import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from 'react'
import './App.css'

type CalendarEvent = {
  id: string
  week: 1 | 2
  day: string
  start: string
  end: string
  title: string
  note: string
  color: string
}

function App() {
  const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница']
  const slotMinutes = 30
  const defaultDurationMinutes = 60
  const scheduleStart = '10:00'
  const scheduleEnd = '20:00'
  const weeks: Array<1 | 2> = [1, 2]
  const colorOptions = [
    { id: 'primary-red', label: 'Красный', value: '#e53935' },
    { id: 'primary-yellow', label: 'Желтый', value: '#fdd835' },
    { id: 'primary-blue', label: 'Синий', value: '#1e88e5' },
    { id: 'pantone-2025', label: 'Mocha Mousse (2025)', value: '#8d6e63' },
    { id: 'pantone-2024', label: 'Peach Fuzz (2024)', value: '#ffb59c' },
    { id: 'pantone-2023', label: 'Viva Magenta (2023)', value: '#bb2649' },
    { id: 'pantone-2022', label: 'Very Peri (2022)', value: '#6667ab' },
    { id: 'pantone-2021', label: 'Illuminating (2021)', value: '#f5df4d' },
  ]
  const defaultColor = colorOptions[0].value

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  }

  const minutesToTime = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }

  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number)
    const date = new Date()
    date.setHours(h, m, 0, 0)
    return new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(date)
  }

  const times = useMemo(() => {
    const result: string[] = []
    const startMinutes = timeToMinutes(scheduleStart)
    const endMinutes = timeToMinutes(scheduleEnd)
    for (let t = startMinutes; t <= endMinutes; t += slotMinutes) {
      result.push(minutesToTime(t))
    }
    return result
  }, [scheduleEnd, scheduleStart, slotMinutes])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const stored = window.localStorage.getItem('work-calendar-theme')
    if (stored === 'light' || stored === 'dark') return stored
    return 'dark'
  })
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [hasLoaded, setHasLoaded] = useState(false)
  const [form, setForm] = useState({
    start: '',
    end: '',
    title: '',
    note: '',
    color: defaultColor,
    weeks: [1 as 1 | 2],
  })
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = window.localStorage.getItem('work-calendar-events')
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CalendarEvent[]
        if (Array.isArray(parsed)) {
          setEvents(
            parsed.map((entry) => ({
              ...entry,
              week: entry.week ?? 1,
              color: entry.color ?? defaultColor,
            })),
          )
        }
      } catch {
        // ignore invalid storage
      }
    }
    setHasLoaded(true)
  }, [defaultColor])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('work-calendar-theme', theme)
  }, [theme])

  useEffect(() => {
    if (!hasLoaded) return
    window.localStorage.setItem('work-calendar-events', JSON.stringify(events))
  }, [events, hasLoaded])

  const handleOpen = (week: 1 | 2, day: string, time: string) => {
    const startMinutes = timeToMinutes(time)
    const defaultEnd = minutesToTime(startMinutes + defaultDurationMinutes)
    setSelectedDay(day)
    setSelectedTime(time)
    setEditingId(null)
    setForm({
      start: time,
      end: defaultEnd,
      title: '',
      note: '',
      color: defaultColor,
      weeks: [week],
    })
    setError('')
    setIsModalOpen(true)
  }

  const handleClose = () => {
    setIsModalOpen(false)
    setError('')
  }

  const handleEditOpen = (eventId: string) => {
    const found = events.find((entry) => entry.id === eventId)
    if (!found) return
    setSelectedDay(found.day)
    setSelectedTime(found.start)
    setEditingId(found.id)
    setForm({
      start: found.start,
      end: found.end,
      title: found.title,
      note: found.note,
      color: found.color ?? defaultColor,
      weeks: [found.week],
    })
    setError('')
    setIsModalOpen(true)
  }

  const handleDelete = () => {
    if (!editingId) return
    setEvents((prev) => prev.filter((entry) => entry.id !== editingId))
    setIsModalOpen(false)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!selectedDay) return
    const startMinutes = timeToMinutes(form.start)
    const endMinutes = timeToMinutes(form.end)
    const minSchedule = timeToMinutes(scheduleStart)
    const maxSchedule = timeToMinutes(scheduleEnd)

    if (!form.title.trim()) {
      setError('Укажите название события.')
      return
    }
    if (endMinutes <= startMinutes) {
      setError('Время окончания должно быть позже начала.')
      return
    }
    if (startMinutes < minSchedule || endMinutes > maxSchedule + slotMinutes) {
      setError('Событие должно быть в пределах расписания.')
      return
    }

    const selectedWeeks = Array.from(new Set(form.weeks)).filter(
      (week): week is 1 | 2 => week === 1 || week === 2,
    )
    if (selectedWeeks.length === 0) {
      setError('Ð’Ñ‹Ð±ÐµÑ€Ð¸Ñ‚Ðµ Ð½ÐµÐ´ÐµÐ»ÑŽ.')
      return
    }

    const overlap = events.some((entry) => {
      if (editingId && entry.id === editingId) return false
      if (!selectedWeeks.includes(entry.week)) return false
      if (entry.day !== selectedDay) return false
      const entryStart = timeToMinutes(entry.start)
      const entryEnd = timeToMinutes(entry.end)
      return startMinutes < entryEnd && endMinutes > entryStart
    })
    if (overlap) {
      setError('Это время уже занято другим событием.')
      return
    }

    if (editingId) {
      setEvents((prev) => {
        const current = prev.find((entry) => entry.id === editingId)
        if (!current) return prev
        const next: CalendarEvent[] = prev.filter((entry) => entry.id !== editingId)
        if (selectedWeeks.includes(current.week)) {
          next.push({
            ...current,
            week: current.week,
            day: selectedDay,
            start: form.start,
            end: form.end,
            title: form.title.trim(),
            note: form.note.trim(),
            color: form.color,
          })
        }
        selectedWeeks
          .filter((week) => week !== current.week)
          .forEach((week) => {
            next.push({
              id: `${week}-${selectedDay}-${form.start}-${form.end}-${Date.now()}`,
              week,
              day: selectedDay,
              start: form.start,
              end: form.end,
              title: form.title.trim(),
              note: form.note.trim(),
              color: form.color,
            })
          })
        return next
      })
    } else {
      setEvents((prev) => [
        ...prev,
        ...selectedWeeks.map((week) => ({
          id: `${week}-${selectedDay}-${form.start}-${form.end}-${Date.now()}`,
          week,
          day: selectedDay,
          start: form.start,
          end: form.end,
          title: form.title.trim(),
          note: form.note.trim(),
          color: form.color,
        })),
      ])
    }
    setIsModalOpen(false)
  }

  const hexToRgb = (hex: string) => {
    const normalized = hex.replace('#', '')
    const value = normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized
    const r = parseInt(value.slice(0, 2), 16)
    const g = parseInt(value.slice(2, 4), 16)
    const b = parseInt(value.slice(4, 6), 16)
    return { r, g, b }
  }

  const getTextColor = (hex: string) => {
    const { r, g, b } = hexToRgb(hex)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.6 ? '#1a1302' : '#fef3d1'
  }

  const mixWithWhite = (hex: string, amount: number) => {
    const { r, g, b } = hexToRgb(hex)
    const mix = (channel: number) => Math.round(channel + (255 - channel) * amount)
    const toHex = (channel: number) => channel.toString(16).padStart(2, '0')
    const mixed = {
      r: mix(r),
      g: mix(g),
      b: mix(b),
    }
    return `#${toHex(mixed.r)}${toHex(mixed.g)}${toHex(mixed.b)}`
  }

  const getEventStyle = (hex: string): CSSProperties => {
    const { r, g, b } = hexToRgb(hex)
    const printBg = mixWithWhite(hex, 0.75)
    const printBorder = mixWithWhite(hex, 0.55)
    return {
      ['--event-bg' as string]: `rgba(${r}, ${g}, ${b}, 0.2)`,
      ['--event-border' as string]: `rgba(${r}, ${g}, ${b}, 0.6)`,
      ['--event-text' as string]: getTextColor(hex),
      ['--event-print-bg' as string]: printBg,
      ['--event-print-border' as string]: printBorder,
      ['--event-print-text' as string]: getTextColor(printBg),
    }
  }

  const coverageByWeek = useMemo(() => {
    const lastSlotEnd = minutesToTime(timeToMinutes(scheduleEnd) + slotMinutes)
    const buildCoverage = (week: 1 | 2) => {
      const coverage = new Map<
        string,
        { byIndex: (string | null)[]; startIndex: Map<string, number>; span: Map<string, number> }
      >()
      days.forEach((day) => {
        coverage.set(day, {
          byIndex: Array(times.length).fill(null),
          startIndex: new Map(),
          span: new Map(),
        })
      })

      events
        .filter((entry) => entry.week === week)
        .forEach((entry) => {
          const dayCoverage = coverage.get(entry.day)
          if (!dayCoverage) return
          const startIndex = times.indexOf(entry.start)
          if (startIndex < 0) return
          let endIndex = times.indexOf(entry.end)
          if (endIndex < 0 && entry.end === lastSlotEnd) {
            endIndex = times.length
          }
          if (endIndex <= startIndex) return
          const span = endIndex - startIndex
          for (let idx = startIndex; idx < endIndex; idx += 1) {
            dayCoverage.byIndex[idx] = entry.id
          }
          dayCoverage.startIndex.set(entry.id, startIndex)
          dayCoverage.span.set(entry.id, span)
        })

      return coverage
    }

    return {
      1: buildCoverage(1),
      2: buildCoverage(2),
    }
  }, [days, events, scheduleEnd, slotMinutes, times])

  return (
    <div className="app">
      <header className="toolbar no-print">
        <div className="toolbar-actions">
          <button
            className="ghost"
            type="button"
            onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          >
            Тема: {theme === 'dark' ? 'тёмная' : 'светлая'}
          </button>
          <button className="primary" onClick={() => window.print()}>
            Печать
          </button>
        </div>
      </header>

      <section className="print-area">
        <div className="calendar-grid">
          {weeks.map((week) => (
            <table
              className="calendar"
              key={week}
              style={{ ['--print-rows' as string]: times.length } as CSSProperties}
            >
              <thead>
                <tr>
                  <th className="time-col">Время</th>
                  {days.map((day) => (
                    <th key={day}>{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {times.map((time, rowIndex) => (
                  <tr key={`${week}-${time}`}>
                    <th className="time-col">{formatTime(time)}</th>
                    {days.map((day) => {
                      const dayCoverage = coverageByWeek[week].get(day)
                      const eventId = dayCoverage?.byIndex[rowIndex] ?? null
                      if (eventId) {
                        const startIndex = dayCoverage?.startIndex.get(eventId)
                        if (startIndex !== rowIndex) {
                          return null
                        }
                        const event = events.find((entry) => entry.id === eventId)
                        const span = dayCoverage?.span.get(eventId) ?? 1
                        if (!event) {
                          return (
                            <td
                              key={`${week}-${day}-${time}`}
                              className="calendar-cell"
                              onClick={() => handleOpen(week, day, time)}
                            />
                          )
                        }
                        return (
                          <td
                            key={`${week}-${day}-${time}`}
                            className="calendar-cell event-cell"
                            rowSpan={span}
                          >
                            <div
                              className="event-card"
                              style={getEventStyle(event.color ?? defaultColor)}
                              role="button"
                              tabIndex={0}
                              onClick={() => handleEditOpen(event.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  handleEditOpen(event.id)
                                }
                              }}
                            >
                              <div className="event-title">{event.title}</div>
                              {event.note && <div className="event-note">{event.note}</div>}
                            </div>
                          </td>
                        )
                      }
                      return (
                        <td
                          key={`${week}-${day}-${time}`}
                          className="calendar-cell"
                          onClick={() => handleOpen(week, day, time)}
                        />
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
      </section>

      {isModalOpen && (
        <div className="modal-backdrop no-print">
          <div className="modal">
            <div className="modal-header">
              <div>
                <div className="modal-title">
                  {editingId ? 'Редактирование события' : 'Новое событие'}
                </div>
                <div className="modal-subtitle">
                  Неделя {form.weeks.join(', ')} • {selectedDay} • {selectedTime ? formatTime(selectedTime) : ''}
                </div>
              </div>
              <button className="modal-close" type="button" onClick={handleClose} aria-label="Закрыть">
                ✕
              </button>
            </div>
            <form className="modal-form" onSubmit={handleSubmit}>
              <label>
                Начало
                <input
                  type="time"
                  step={slotMinutes * 60}
                  min={scheduleStart}
                  max={scheduleEnd}
                  value={form.start}
                  onChange={(event) => {
                    const nextStart = event.target.value
                    const nextStartMinutes = timeToMinutes(nextStart)
                    const nextEndMinutes = Math.max(
                      nextStartMinutes + slotMinutes,
                      timeToMinutes(form.end),
                    )
                    setForm({
                      ...form,
                      start: nextStart,
                      end: minutesToTime(nextEndMinutes),
                    })
                  }}
                  required
                />
              </label>
              <label>
                Конец
                <input
                  type="time"
                  step={slotMinutes * 60}
                  min={form.start}
                  max={minutesToTime(timeToMinutes(scheduleEnd) + slotMinutes)}
                  value={form.end}
                  onChange={(event) => setForm({ ...form, end: event.target.value })}
                  required
                />
              </label>
              <div className="span-2">
                <div className="field-label">Неделя</div>
                <div className="week-toggle">
                  {weeks.map((week) => {
                    const isSelected = form.weeks.includes(week)
                    return (
                      <label key={week} className={`week-option${isSelected ? ' selected' : ''}`}>
                        <input
                          type="checkbox"
                          name="eventWeeks"
                          value={week}
                          checked={isSelected}
                          onChange={() => {
                            const next = isSelected
                              ? form.weeks.filter((value) => value !== week)
                              : [...form.weeks, week]
                            setForm({ ...form, weeks: next })
                          }}
                        />
                        Неделя {week}
                      </label>
                    )
                  })}
                </div>
              </div>
              <label className="span-2">
                Название
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="Например: созвон с командой"
                  required
                />
              </label>
              <label className="span-2">
                Комментарий
                <textarea
                  rows={3}
                  value={form.note}
                  onChange={(event) => setForm({ ...form, note: event.target.value })}
                  placeholder="Дополнительные детали"
                />
              </label>
              <label className="span-2">
                Цвет
                <div className="color-grid">
                  {colorOptions.map((option) => (
                    <label
                      key={option.id}
                      className={`color-option${form.color === option.value ? ' selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="eventColor"
                        value={option.value}
                        checked={form.color === option.value}
                        onChange={() => setForm({ ...form, color: option.value })}
                      />
                      <span className="color-swatch" style={{ backgroundColor: option.value }} />
                      <span className="color-label">{option.label}</span>
                    </label>
                  ))}
                </div>
              </label>
              {error && <div className="form-error span-2">{error}</div>}
              <div className="modal-actions span-2">
                {editingId && (
                  <button className="danger" type="button" onClick={handleDelete}>
                    Удалить
                  </button>
                )}
                <button className="primary" type="submit">
                  {editingId ? 'Обновить' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

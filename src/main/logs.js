import fs from 'fs'
import path from 'path'
import { app } from 'electron'

const logsPath = path.join(app.getPath('userData'), 'logs.json')

export function getLogs() {
  try {
    if (!fs.existsSync(logsPath)) {
      return []
    }
    const data = fs.readFileSync(logsPath, 'utf-8')
    return JSON.parse(data)
  } catch (err) {
    console.error('Error reading logs:', err)
    return []
  }
}

export function writeLog(level, context, message) {
  try {
    const logs = getLogs()
    const newEntry = {
      timestamp: new Date().toISOString(),
      level, // 'info' | 'error' | 'warning'
      context, // 'backup' | 'restore' | 'system'
      message
    }
    logs.push(newEntry)
    // Keep last 300 logs
    if (logs.length > 300) {
      logs.shift()
    }
    fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2), 'utf-8')
  } catch (err) {
    console.error('Error writing log:', err)
  }
}

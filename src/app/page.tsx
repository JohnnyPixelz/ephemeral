"use client"

import axios from "axios"
import { Upload, Copy, Trash2, Sun, Moon, Check } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { v4 } from "uuid"
import { useTheme } from "next-themes"

type EphemeralFile = {
  id: string
  file: File
  progress: number
  url?: string
  uploadedAt?: number
  expiresAt?: number
}

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900/50 dark:to-slate-800/40 text-zinc-900 dark:text-zinc-100 relative overflow-hidden transition-colors duration-300">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-pink-300/20 to-indigo-300/20 dark:from-pink-400/10 dark:to-indigo-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-cyan-300/20 to-purple-300/20 dark:from-cyan-400/10 dark:to-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-blue-200/10 to-indigo-200/10 dark:from-blue-400/5 dark:to-indigo-400/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>
      <MainPage />
    </div>
  )
}

function MainPage() {
  const [files, setFiles] = useState<EphemeralFile[]>([])
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [origin, setOrigin] = useState("")
  const [copyMsg, setCopyMsg] = useState<string | null>(null)
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null)
  const { theme, setTheme } = useTheme()

  // eslint-disable-next-line
  useEffect(() => setOrigin(`${window.location.protocol}//${window.location.host}`), [])

  useEffect(() => {
    if (!copyMsg) return
    const t = setTimeout(() => setCopyMsg(null), 1800)
    return () => clearTimeout(t)
  }, [copyMsg])

  // cleanup expired files locally every 5s
  useEffect(() => {
    const id = setInterval(() => {
      setFiles((f) => f.filter((x) => !x.expiresAt || x.expiresAt > Date.now()))
    }, 5000)
    return () => clearInterval(id)
  }, [])

  const onFiles = (selected: FileList | null) => {
    if (!selected || selected.length === 0) return
    const newFiles: EphemeralFile[] = Array.from(selected).map((file) => ({
      id: v4(),
      file,
      progress: 0,
    }))
    setFiles((s) => [...newFiles, ...s])
    newFiles.forEach(uploadFile)
    if (inputRef.current) inputRef.current.value = ""
  }

  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const uploadFile = async (ef: EphemeralFile) => {
    try {
      await axios.request({
        method: "post",
        url: "/upload",
        headers: {
          "Content-Type": ef.file.type,
          "Content-Disposition": `attachment; filename="${ef.file.name}"`,
          "X-Filename": ef.file.name,
        },
        data: ef.file,
        onUploadProgress: (p) => {
          setFiles((s) => s.map((x) => (x.id === ef.id ? { ...x, progress: (p.loaded / (p.total || ef.file.size)) * 100 } : x)))
        },
      }).then((res) => {
        const url = res.data?.url
        const uploadedAt = Date.now()
        const expiresAt = uploadedAt + 10 * 60 * 1000 // 10 minutes
        setFiles((s) => s.map((x) => (x.id === ef.id ? { ...x, url, uploadedAt, expiresAt, progress: 100 } : x)))
      })
    } catch (err) {
      console.error("upload failed", err)
      setFiles((s) => s.filter((x) => x.id !== ef.id))
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    onFiles(e.dataTransfer.files)
  }

  const handleCopy = async (url?: string, fileId?: string) => {
    if (!url || !fileId) return
    try {
      await navigator.clipboard.writeText(url)
      setCopyMsg("Copied!")
      setCopiedFileId(fileId)

      // Reset the icon back to copy after 3 seconds
      setTimeout(() => {
        setCopiedFileId(null)
      }, 3000)
    } catch {
      setCopyMsg("Copy failed")
    }
  }

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark")

  return (
    <div className="relative z-10">
      <nav className="w-full py-8 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-b border-white/20 dark:border-slate-700/20 shadow-lg shadow-black/5 dark:shadow-black/20 transition-colors duration-300">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-cyan-500 flex items-center justify-center shadow-lg">
                <div className="w-3 h-3 rounded-full bg-white dark:bg-slate-100"></div>
              </div>
              <div className="text-indigo-700 dark:text-indigo-400 font-bold text-xl tracking-tight transition-colors duration-300">ephemeral.</div>
            </div>
            <div className="hidden sm:block text-sm text-zinc-500 dark:text-zinc-400 font-medium transition-colors duration-300">temporary links — self-destruct in 10 minutes</div>
          </div>
          <div className="flex items-center gap-4">
            <a className="text-sm text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors duration-200 hover:scale-105 transform" href="#">
              Docs
            </a>
            <button
              onClick={toggleTheme}
              className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/20 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 group"
            >
              {theme === "dark" ?
                <Sun className="h-4 w-4 text-amber-500 group-hover:rotate-180 transition-transform duration-300" /> :
                <Moon className="h-4 w-4 text-slate-600 dark:text-slate-400 group-hover:-rotate-12 transition-transform duration-300" />
              }
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex items-start justify-center py-20 relative">
        <div className="max-w-6xl w-full px-6 container">
          <header className="text-center mb-16">
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-black leading-none bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 dark:from-indigo-400 dark:via-purple-400 dark:to-cyan-400 bg-clip-text text-transparent mb-6">
              Share files in
              <span className="block text-slate-900 dark:text-slate-100 transition-colors duration-300">seconds</span>
            </h1>
            <p className="text-xl md:text-2xl text-zinc-600 dark:text-zinc-300 max-w-3xl mx-auto leading-relaxed font-medium transition-colors duration-300">
              Drop, upload, share. Your files{" "}
              <span className="text-red-500 dark:text-red-400 font-bold">self-destruct</span>{" "}
              in 10 minutes. No accounts, no tracking, just simple ephemeral sharing.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-zinc-500 dark:text-zinc-400 transition-colors duration-300">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-400 dark:bg-emerald-500"></div>
                <span>Auto-delete after 10min</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-400 dark:bg-blue-500"></div>
                <span>No registration required</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-400 dark:bg-purple-500"></div>
                <span>Direct download links</span>
              </div>
            </div>
          </header>

          <section className="relative backdrop-blur-xl bg-white/30 dark:bg-slate-900/30 rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/20 p-8 md:p-12 overflow-hidden transition-colors duration-300">
            {/* Decorative elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-cyan-500/5 dark:from-indigo-400/5 dark:via-purple-400/5 dark:to-cyan-400/5 rounded-3xl"></div>
            <div className="absolute top-4 right-4 w-32 h-32 bg-gradient-to-br from-pink-200/20 to-indigo-200/20 dark:from-pink-300/10 dark:to-indigo-300/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-4 left-4 w-24 h-24 bg-gradient-to-br from-cyan-200/20 to-purple-200/20 dark:from-cyan-300/10 dark:to-purple-300/10 rounded-full blur-2xl"></div>

            {/* Drop area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
              className={`relative w-full rounded-2xl border-2 border-dotted transition-all duration-300 p-16 text-center group cursor-pointer ${isDragging
                ? 'border-indigo-400 dark:border-indigo-500 shadow-2xl bg-gradient-to-br from-indigo-50/80 via-purple-50/80 to-cyan-50/80 dark:from-indigo-900/30 dark:via-purple-900/30 dark:to-cyan-900/30 scale-[1.02] transform'
                : 'border-zinc-300/60 dark:border-slate-600/60 bg-white/40 dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:shadow-xl'
                }`}
            >
              <div className="max-w-4xl mx-auto relative z-10">
                <div className={`rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-cyan-500 dark:from-indigo-500 dark:via-purple-500 dark:to-cyan-400 p-6 shadow-2xl inline-block transition-transform duration-300 ${isDragging ? 'scale-110 rotate-3' : 'group-hover:scale-105 group-hover:-rotate-1'}`}>
                  <Upload className="h-12 w-12 text-white" />
                </div>
                <h3 className="text-4xl md:text-5xl font-bold mt-8 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-100 dark:via-slate-200 dark:to-slate-100 bg-clip-text text-transparent transition-all duration-300">
                  {isDragging ? "Drop it like it's hot! 🔥" : "Drop your files here"}
                </h3>
                <p className="text-lg text-zinc-600 dark:text-zinc-300 max-w-2xl mx-auto mt-4 leading-relaxed transition-colors duration-300">
                  {isDragging
                    ? "Release to upload your files — they'll be ready in seconds!"
                    : "Drag & drop any files, or click browse. Maximum security, minimum fuss."
                  }
                </p>

                <div className="mt-10">
                  <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} id="file-input" />
                  <label htmlFor="file-input">
                    <button className="group inline-flex items-center gap-4 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 dark:from-indigo-500 dark:via-purple-500 dark:to-cyan-400 text-white text-lg font-semibold shadow-2xl hover:shadow-indigo-500/25 dark:hover:shadow-indigo-400/25 transition-all duration-300 hover:scale-105 hover:-translate-y-1" onClick={() => inputRef.current?.click()}>
                      <span>Browse files</span>
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
                        <Upload className="h-3 w-3" />
                      </div>
                    </button>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-12 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-xl font-bold text-zinc-800 dark:text-zinc-200 transition-colors duration-300">Recent uploads</h4>
                {files.length > 0 && (
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-100/60 dark:bg-slate-800/60 px-3 py-1 rounded-full transition-colors duration-300">
                    {files.length} file{files.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {files.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center transition-colors duration-300">
                      <Upload className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
                    </div>
                    <div className="text-lg text-zinc-400 dark:text-zinc-500 font-medium transition-colors duration-300">No uploads yet</div>
                    <div className="text-sm text-zinc-400 dark:text-zinc-500 mt-1 transition-colors duration-300">Drop some files to get started!</div>
                  </div>
                )}
                {files.map((f, index) => (
                  <div
                    key={f.id}
                    className="group flex items-center justify-between gap-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur border border-white/20 dark:border-slate-700/20 p-5 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 dark:from-indigo-400 dark:to-purple-400 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <div className="text-white font-bold text-sm">
                          {f.file.name.split('.').pop()?.toUpperCase() || 'FILE'}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-semibold truncate text-zinc-800 dark:text-zinc-200 transition-colors duration-300">{f.file.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 transition-colors duration-300">
                            {(f.file.size / 1024 / 1024).toFixed(1)} MB
                          </div>
                          <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600"></div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 transition-colors duration-300">
                            {f.uploadedAt ? <ExpiryLabel expiresAt={f.expiresAt!} /> : <span className="text-blue-500 dark:text-blue-400 font-medium">Uploading…</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {!f.url && <ProgressBar value={f.progress} />}
                      {f.url && (
                        <div className="flex items-center gap-3">
                          <a
                            href={`${origin}${f.url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-medium truncate max-w-[12rem] bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-lg transition-colors duration-300"
                          >
                            {f.url}
                          </a>
                          <button
                            onClick={() => handleCopy(`${origin}${f.url}`, f.id)}
                            className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-white/20 dark:border-slate-700/20 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 group/copy"
                          >
                            {copiedFileId === f.id ? (
                              <Check className="h-4 w-4 text-green-600 dark:text-green-400 transition-colors" />
                            ) : (
                              <Copy className="h-4 w-4 text-zinc-600 dark:text-zinc-400 group-hover/copy:text-indigo-600 dark:group-hover/copy:text-indigo-400 transition-colors" />
                            )}
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => setFiles((s) => s.filter((x) => x.id !== f.id))}
                        className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-white/20 dark:border-slate-700/20 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 hover:bg-red-50 dark:hover:bg-red-900/20 group/delete"
                      >
                        <Trash2 className="h-4 w-4 text-zinc-400 dark:text-zinc-500 group-hover/delete:text-red-500 dark:group-hover/delete:text-red-400 transition-colors" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {copyMsg && (
              <div className="fixed bottom-8 right-8 bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border border-white/20 animate-in slide-in-from-bottom-2 duration-300 z-50">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                  <span className="font-semibold">{copyMsg}</span>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

function ProgressBar({ value }: { value?: number }) {
  const v = Math.max(0, Math.min(100, value || 0))
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 h-3 bg-gradient-to-r from-zinc-200 to-zinc-100 dark:from-slate-700 dark:to-slate-600 rounded-full overflow-hidden shadow-inner transition-colors duration-300">
        <div
          style={{ width: `${v}%` }}
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 dark:from-indigo-400 dark:via-purple-400 dark:to-cyan-400 rounded-full transition-all duration-300 shadow-sm relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent rounded-full"></div>
        </div>
      </div>
      <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 min-w-[3rem] transition-colors duration-300">{Math.round(v)}%</span>
    </div>
  )
}

function ExpiryLabel({ expiresAt }: { expiresAt: number }) {
  // eslint-disable-next-line
  const [remaining, setRemaining] = useState<number>(Math.max(0, expiresAt - Date.now()))

  useEffect(() => {
    const id = setInterval(() => setRemaining(Math.max(0, expiresAt - Date.now())), 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  if (remaining <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-full transition-colors duration-300">
        <div className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-400"></div>
        Expired
      </span>
    )
  }

  const m = Math.floor(remaining / 60000)
  const s = Math.floor((remaining % 60000) / 1000)
  const isUrgent = remaining < 120000 // Less than 2 minutes

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full transition-colors duration-300 ${isUrgent
      ? 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 animate-pulse'
      : 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30'
      }`}>
      <div className={`w-2 h-2 rounded-full ${isUrgent ? 'bg-amber-500 dark:bg-amber-400' : 'bg-emerald-500 dark:bg-emerald-400'}`}></div>
      expires in {m}:{s.toString().padStart(2, "0")}
    </span>
  )
}

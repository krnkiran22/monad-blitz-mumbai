"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MonadMark } from "./MonadMark";

export interface GameSettings {
  cameraAutoRotate: boolean;
  showHealthBars: boolean;
  matchSpeed: number; // 0.5 - 2
  betStep: string;
}

interface Props {
  open: boolean;
  settings: GameSettings;
  onChange: (s: GameSettings) => void;
  onClose: () => void;
}

export function SettingsModal({ open, settings, onChange, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="glass glow-purple rounded-3xl w-full max-w-md p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <MonadMark size={24} />
                <h2 className="text-xl font-black text-white tracking-wide">SETTINGS</h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full glass flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5">
              <Toggle
                label="Camera Auto-Rotate"
                desc="Orbit the arena automatically"
                value={settings.cameraAutoRotate}
                onChange={(v) => onChange({ ...settings, cameraAutoRotate: v })}
              />
              <Toggle
                label="Show Health Bars"
                desc="Display agent HP above heads"
                value={settings.showHealthBars}
                onChange={(v) => onChange({ ...settings, showHealthBars: v })}
              />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white font-bold text-sm">Match Speed</p>
                    <p className="text-gray-500 text-xs">How fast agents fight</p>
                  </div>
                  <span className="text-[#a78bfa] font-mono font-bold text-sm">
                    {settings.matchSpeed.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={settings.matchSpeed}
                  onChange={(e) => onChange({ ...settings, matchSpeed: parseFloat(e.target.value) })}
                  className="w-full accent-[#836ef9]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white font-bold text-sm">Default Bet (MON)</p>
                    <p className="text-gray-500 text-xs">Pre-filled stake amount</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {["0.001", "0.01", "0.05", "0.1"].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => onChange({ ...settings, betStep: amt })}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold font-mono transition-all ${
                        settings.betStep === amt
                          ? "bg-[#836ef9] text-white"
                          : "glass text-gray-400 hover:text-white"
                      }`}
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-7 pt-5 border-t border-white/10 text-center">
              <p className="text-xs text-gray-500">
                Connected to <span className="text-[#836ef9] font-bold">Monad Testnet</span> · Chain 10143
              </p>
            </div>

            <button
              onClick={onClose}
              className="mt-5 w-full py-3 rounded-xl bg-gradient-to-r from-[#836ef9] to-[#6246ea] text-white font-black tracking-wide hover:opacity-90 transition-opacity"
            >
              DONE
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Toggle({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-white font-bold text-sm">{label}</p>
        <p className="text-gray-500 text-xs">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          value ? "bg-[#836ef9]" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            value ? "translate-x-6" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

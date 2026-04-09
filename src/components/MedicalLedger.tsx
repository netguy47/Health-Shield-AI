import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { unmaskLogData, encryptSovereignData } from '../lib/encryption';
import { Edit3, Check, X, ShieldCheck, AlertCircle } from 'lucide-react';

interface MedicalLedgerProps {
  logs: any[];
  isPremium: boolean;
}

const MedicalLedger: React.FC<MedicalLedgerProps> = ({ logs, isPremium }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});

  const handleEdit = (log: any) => {
    setEditingId(log.id);
    setEditValues({
      heart_rate: log.heart_rate,
      systolic: log.systolic || 120,
      diastolic: log.diastolic || 80,
    });
  };

  const handleSave = async (id: string) => {
    try {
      const logRef = doc(db, 'health_logs', id);
      
      // Encrypt the values before saving (Sovereign Security)
      const encryptedUpdate = {
        heart_rate: encryptSovereignData(String(editValues.heart_rate)),
        systolic: encryptSovereignData(String(editValues.systolic)),
        diastolic: encryptSovereignData(String(editValues.diastolic)),
        modified_at: serverTimestamp(),
        sovereign_masked: true
      };

      await updateDoc(logRef, encryptedUpdate);
      setEditingId(null);
    } catch (error) {
      console.error('Update Failed:', error);
      alert('Sovereign node rejected update. Verify connection.');
    }
  };

  return (
    <div className="obsidian-card" style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 className="technical" style={{ fontSize: '1rem' }}>SOVEREIGN MEDICAL LEDGER</h3>
        <ShieldCheck size={16} style={{ color: '#00F2FF' }} />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <th className="technical" style={{ padding: '12px 0', fontSize: '0.65rem', color: '#849495' }}>TIMESTAMP</th>
              <th className="technical" style={{ padding: '12px 0', fontSize: '0.65rem', color: '#849495' }}>BP (SYS/DIA)</th>
              <th className="technical" style={{ padding: '12px 0', fontSize: '0.65rem', color: '#849495' }}>PULSE</th>
              <th className="technical" style={{ padding: '12px 0', fontSize: '0.65rem', color: '#849495' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((rawLog) => {
              const log = unmaskLogData(rawLog);
              const isEditing = editingId === log.id;

              return (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
                  <td style={{ padding: '16px 0', fontSize: '0.75rem', color: '#849495' }}>
                    {log.timestamp?.toDate ? new Date(log.timestamp.toDate()).toLocaleDateString() : 'REALTIME'}
                  </td>
                  <td style={{ padding: '16px 0' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input 
                          type="number" 
                          value={editValues.systolic} 
                          onChange={(e) => setEditValues({...editValues, systolic: e.target.value})}
                          style={{ width: '40px', background: '#111', border: '1px solid #333', color: '#fff', fontSize: '0.75rem' }} 
                        />
                        <span style={{ color: '#333' }}>/</span>
                        <input 
                          type="number" 
                          value={editValues.diastolic} 
                          onChange={(e) => setEditValues({...editValues, diastolic: e.target.value})}
                          style={{ width: '40px', background: '#111', border: '1px solid #333', color: '#fff', fontSize: '0.75rem' }} 
                        />
                      </div>
                    ) : (
                      <span className="technical" style={{ fontSize: '0.85rem' }}>
                        {log.systolic || '--'} / {log.diastolic || '--'}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '16px 0' }}>
                    {isEditing ? (
                      <input 
                        type="number" 
                        value={editValues.heart_rate} 
                        onChange={(e) => setEditValues({...editValues, heart_rate: e.target.value})}
                        style={{ width: '50px', background: '#111', border: '1px solid #333', color: '#fff', fontSize: '0.75rem' }} 
                      />
                    ) : (
                      <span className="technical" style={{ fontSize: '0.85rem', color: '#00F2FF' }}>{log.heart_rate} BPM</span>
                    )}
                  </td>
                  <td style={{ padding: '16px 0' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Check size={14} style={{ cursor: 'pointer', color: '#00F2FF' }} onClick={() => handleSave(log.id)} />
                        <X size={14} style={{ cursor: 'pointer', color: '#FF5050' }} onClick={() => setEditingId(null)} />
                      </div>
                    ) : (
                      <Edit3 size={14} style={{ cursor: 'pointer', color: '#849495' }} onClick={() => handleEdit(log)} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!isPremium && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255, 80, 80, 0.05)', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <AlertCircle size={16} style={{ color: '#FF5050' }} />
          <p style={{ fontSize: '0.65rem', color: '#FF5050', lineHeight: 1.4 }}>
            UNLICENSED NODE: Historical editing is restricted to local session logs. Activate Sovereign Access to write directly to your permanent medical archive.
          </p>
        </div>
      )}
    </div>
  );
};

export default MedicalLedger;

import React, { useState, useRef, useEffect } from 'react';
import { Customer, Order } from '../../types';
import { initDB, logAction } from '../../db';
import { X, Save, Camera, Trash2, Ruler, CheckCircle2, Edit3, Sparkles, Mic, Square, Play } from 'lucide-react';
import { formatCurrency, showToast, compressImage, cn } from '../../utils';

interface Props {
  customer: Customer;
  orderToEdit?: Order;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewOrderModal({ customer, orderToEdit, onClose, onSuccess }: Props) {
  const [desc, setDesc] = useState(orderToEdit?.description || '');
  const [price, setPrice] = useState(orderToEdit?.price !== undefined ? orderToEdit.price.toString() : '');
  const [status, setStatus] = useState<Order['status']>(orderToEdit?.status || 'pending');
  const [deliveryDate, setDeliveryDate] = useState(
    orderToEdit?.deliveryDate ? new Date(orderToEdit.deliveryDate).toISOString().split('T')[0] : ''
  );
  const [selectedDays, setSelectedDays] = useState<number | null>(null);
  const [photo, setPhoto] = useState<string | null>(orderToEdit?.photo || null);
  const [voiceNote, setVoiceNote] = useState<string | null>(orderToEdit?.voiceNote || null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setVoiceNote(reader.result as string);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone", error);
      showToast('تعذر الوصول إلى الميكروفون', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  
  const setDeliveryDateByDays = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setDeliveryDate(date.toISOString().split('T')[0]);
    setSelectedDays(days);
  };
  
  const [measurements, setMeasurements] = useState({
    shoulder: orderToEdit?.measurements?.shoulder || '',
    bust: orderToEdit?.measurements?.bust || '',
    waist: orderToEdit?.measurements?.waist || '',
    hips: orderToEdit?.measurements?.hips || '',
    sleeve: orderToEdit?.measurements?.sleeve || '',
    yokeLength: orderToEdit?.measurements?.yokeLength || '',
    skirtLength: orderToEdit?.measurements?.skirtLength || '',
    dressLength: orderToEdit?.measurements?.dressLength || '',
    pantsLength: orderToEdit?.measurements?.pantsLength || ''
  });

  const [savedMeasurements, setSavedMeasurements] = useState<Record<string, string> | null>(null);
  const [useSavedMeasurements, setUseSavedMeasurements] = useState<boolean>(false);

  useEffect(() => {
    async function loadSavedMeasurements() {
      if (orderToEdit) return;

      let found: Record<string, string> | null = null;

      // 1. Check customer's direct measurements property
      if (customer.measurements) {
        const hasValues = Object.values(customer.measurements).some(val => Boolean(val && val.trim()));
        if (hasValues) {
          found = {
            shoulder: customer.measurements.shoulder || '',
            bust: customer.measurements.bust || '',
            waist: customer.measurements.waist || '',
            hips: customer.measurements.hips || '',
            sleeve: customer.measurements.sleeve || '',
            yokeLength: customer.measurements.yokeLength || '',
            skirtLength: customer.measurements.skirtLength || '',
            dressLength: customer.measurements.dressLength || '',
            pantsLength: customer.measurements.pantsLength || ''
          };
        }
      }

      // 2. Check previous orders for this customer if not on profile
      if (!found) {
        try {
          const db = await initDB();
          const prevOrders = await db.getAllFromIndex('orders', 'by-customer', customer.id);
          prevOrders.sort((a, b) => b.date - a.date);
          for (const ord of prevOrders) {
            if (ord.measurements) {
              const hasVals = Object.values(ord.measurements).some(val => Boolean(val && val.trim()));
              if (hasVals) {
                found = {
                  shoulder: ord.measurements.shoulder || '',
                  bust: ord.measurements.bust || '',
                  waist: ord.measurements.waist || '',
                  hips: ord.measurements.hips || '',
                  sleeve: ord.measurements.sleeve || '',
                  yokeLength: ord.measurements.yokeLength || '',
                  skirtLength: ord.measurements.skirtLength || '',
                  dressLength: ord.measurements.dressLength || '',
                  pantsLength: ord.measurements.pantsLength || ''
                };
                break;
              }
            }
          }
        } catch (err) {
          console.error('Error fetching previous order measurements:', err);
        }
      }

      if (found) {
        setSavedMeasurements(found);
        setMeasurements(found);
        setUseSavedMeasurements(true);
      }
    }

    loadSavedMeasurements();
  }, [customer, orderToEdit]);

  const handleSelectSaved = () => {
    if (savedMeasurements) {
      setMeasurements(savedMeasurements);
      setUseSavedMeasurements(true);
      showToast('تمت تعبئة القياسات السابقة بنجاح', 'info');
    }
  };

  const handleSelectCustom = () => {
    setMeasurements({
      shoulder: '',
      bust: '',
      waist: '',
      hips: '',
      sleeve: '',
      yokeLength: '',
      skirtLength: '',
      dressLength: '',
      pantsLength: ''
    });
    setUseSavedMeasurements(false);
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedDataUrl = await compressImage(file, 700, 700, 0.55);
      setPhoto(compressedDataUrl);
      showToast('تم ضغط وتصغير صورة الموديل لتقليل المساحة', 'info');
    } catch (err) {
      console.error('Error compressing image:', err);
      showToast('تعذر معالجة الصورة المصورة', 'error');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc) return;

    const db = await initDB();
    const order: Order = {
      id: orderToEdit ? orderToEdit.id : crypto.randomUUID(),
      customerId: customer.id,
      customerName: customer.name,
      description: desc,
      price: parseFloat(price || '0'),
      status: status,
      date: orderToEdit ? orderToEdit.date : Date.now(),
      deliveryDate: deliveryDate ? new Date(deliveryDate).getTime() : undefined,
      measurements,
      ...(photo ? { photo } : {}),
      ...(voiceNote ? { voiceNote } : {})
    };
    
    await db.put('orders', order);

    // Save/update customer measurements for future orders
    const hasAnyMeasurement = Object.values(measurements).some(val => Boolean(val && val.trim()));
    if (hasAnyMeasurement) {
      try {
        const updatedCustomer: Customer = {
          ...customer,
          measurements: { ...measurements }
        };
        await db.put('customers', updatedCustomer);
      } catch (err) {
        console.error('Error updating customer measurements profile:', err);
      }
    }

    if (orderToEdit) {
      await logAction('تعديل طلب', `تعديل طلب للزبون ${customer.name} بقيمة ${formatCurrency(order.price)}`);
      showToast(`تم تعديل الطلب للزبون ${customer.name} بنجاح`);
    } else {
      await logAction('طلب جديد', `طلب خياطة للزبون ${customer.name} بقيمة ${formatCurrency(order.price)}`);
      showToast(`تم إضافة الطلب وحفظ قياسات ${customer.name} للطلبات القادمة`);
    }
    
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-3 pb-20 sm:p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[28px] overflow-hidden shadow-2xl ring-1 ring-slate-900/5 dark:ring-white/10 flex flex-col max-h-[82vh] sm:max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-l from-indigo-600 to-blue-700 dark:from-indigo-900 dark:to-slate-800 px-5 py-4 flex justify-between items-center text-white shrink-0 shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-x-16 -translate-y-16 pointer-events-none"></div>
          <h3 className="text-xl font-black relative z-10">{orderToEdit ? 'تعديل طلب' : 'طلب جديد'} - {customer.name}</h3>
          <button type="button" onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all text-white backdrop-blur-sm relative z-10 active:scale-95">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
          
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            
            {/* Options Bar for Saved vs New Measurements */}
            {savedMeasurements && (
              <div className="bg-blue-50/90 dark:bg-blue-950/50 p-3 rounded-2xl border-2 border-blue-200 dark:border-blue-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <Ruler size={16} className="text-blue-600 dark:text-blue-400" />
                    توجد قياسات محفوظة للزبون
                  </span>
                  <span className="text-[10px] font-bold bg-blue-200/80 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">
                    من طلب سابق
                  </span>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSelectSaved}
                    className={cn(
                      "flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border active:scale-95",
                      useSavedMeasurements
                        ? "bg-blue-600 text-white border-blue-700 shadow-sm"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-blue-100/50"
                    )}
                  >
                    <CheckCircle2 size={14} />
                    نفس القياسات القديمة
                  </button>

                  <button
                    type="button"
                    onClick={handleSelectCustom}
                    className={cn(
                      "flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border active:scale-95",
                      !useSavedMeasurements
                        ? "bg-purple-600 text-white border-purple-700 shadow-sm"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-purple-100/50"
                    )}
                  >
                    <Edit3 size={14} />
                    قياسات جديدة مختلفة
                  </button>
                </div>
              </div>
            )}

            {/* Smart Measurement Area */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 flex gap-4 items-center relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl translate-x-10 -translate-y-10 pointer-events-none"></div>
              
              {/* Fields on Right */}
              <div className="flex-1 flex flex-col gap-2 relative z-10">
                {[
                  { id: 'shoulder', label: 'الكتف' },
                  { id: 'bust', label: 'الصدر' },
                  { id: 'waist', label: 'الخصر' },
                  { id: 'hips', label: 'الورك' },
                  { id: 'sleeve', label: 'الردن' },
                  { id: 'yokeLength', label: 'طول الزخمة' },
                  { id: 'skirtLength', label: 'طول التنورة' },
                  { id: 'dressLength', label: 'طول الفستان' },
                  { id: 'pantsLength', label: 'طول البنطرون' },
                ].map(field => (
                  <div key={field.id} className="flex items-center gap-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 w-20 shrink-0 leading-tight">{field.label}</label>
                      <input 
                        type="number"
                        inputMode="numeric"
                        placeholder="سم"
                        value={measurements[field.id as keyof typeof measurements] || ''}
                        onChange={(e) => {
                          setMeasurements({...measurements, [field.id]: e.target.value});
                          setUseSavedMeasurements(false);
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-2 py-1.5 text-sm text-center font-bold text-slate-800 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-sm"
                        dir="ltr"
                      />
                  </div>
                ))}
              </div>

              {/* Silhouette on Left */}
              <div className="w-24 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 100 250" className="w-full h-auto drop-shadow-sm" strokeLinecap="round" strokeLinejoin="round">
                  {/* Body Base */}
                  <g className="stroke-slate-400 fill-slate-100 dark:fill-slate-800" strokeWidth="3">
                    <circle cx="50" cy="25" r="12" />
                    <path d="M46 37 v 8 m 8 -8 v 8" />
                    <path d="M 20 55 Q 50 45 80 55" />
                    <path d="M 20 55 Q 10 100 15 140 m 65 -85 Q 90 100 85 140" />
                    <path d="M 30 65 Q 40 100 35 120 Q 30 150 20 220 L 80 220 Q 70 150 65 120 Q 60 100 70 65" />
                  </g>
                  {/* Measurement Guides */}
                  <g className="stroke-indigo-500" strokeWidth="1.5" strokeDasharray="3,3">
                    <path d="M 25 55 L 75 55" /> {/* Shoulder */}
                    <path d="M 32 85 L 68 85" /> {/* Bust */}
                    <path d="M 36 120 L 64 120" /> {/* Waist */}
                    <path d="M 28 150 L 72 150" /> {/* Hips */}
                    <path d="M 17 55 L 13 130" /> {/* Sleeve */}
                    <path d="M 50 37 L 50 210" /> {/* Length */}
                  </g>
                </svg>
              </div>
            </div>

            {/* Order Details */}
            <div className="space-y-5 border-t border-slate-200 dark:border-slate-700/60 pt-5">
              {/* Photo Capture */}
              <div>
                <label className="block text-slate-700 dark:text-slate-200 font-bold mb-2 text-sm">صورة القطعة / الموديل (اختياري)</label>
                
                {!photo ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-600 rounded-2xl px-4 py-8 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors shadow-sm"
                  >
                    <div className="bg-white dark:bg-slate-700 p-3 rounded-full shadow-sm">
                      <Camera size={28} className="text-slate-600 dark:text-slate-300" />
                    </div>
                    <span className="font-bold text-sm">إرفاق صورة للزبون أو القماش</span>
                  </button>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 inline-block w-full h-48 shadow-sm">
                    <img src={photo} alt="Captured" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhoto(null)}
                      className="absolute top-2 left-2 bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 shadow-md"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                )}
                
                <input 
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  className="hidden"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-200 font-bold mb-2 text-sm">تفاصيل الطلب (نوع القطعة)</label>
                <textarea 
                  required
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all min-h-[90px] mb-3 shadow-sm"
                  placeholder="اكتب تفاصيل القطعة هنا (فستان، عباءة، قميص...)"
                />

                <div className="flex flex-col gap-2">
                  {!voiceNote && !isRecording && (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="w-full bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-400 rounded-2xl px-4 py-2.5 flex items-center justify-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors font-bold text-sm shadow-sm"
                    >
                      <Mic size={18} />
                      إضافة بصمة صوتية للتفاصيل
                    </button>
                  )}
                  {isRecording && (
                    <div className="w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 rounded-2xl px-4 py-2 flex items-center justify-between font-bold text-sm shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-600 dark:bg-red-500 animate-pulse" />
                        جاري التسجيل... {formatTime(recordingTime)}
                      </div>
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="bg-red-200 dark:bg-red-800/60 text-red-800 dark:text-red-200 p-1.5 rounded-lg hover:bg-red-300 dark:hover:bg-red-800 transition-colors"
                      >
                        <Square size={16} className="fill-current" />
                      </button>
                    </div>
                  )}
                  {voiceNote && !isRecording && (
                    <div className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2 flex items-center gap-3 shadow-sm">
                      <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <Mic size={18} />
                      </div>
                      <audio controls src={voiceNote} className="h-9 flex-1 max-w-full" />
                      <button
                        type="button"
                        onClick={() => setVoiceNote(null)}
                        className="text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-200 font-bold mb-2 text-sm">حالة الطلب</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as Order['status'])}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm appearance-none"
                >
                  <option value="pending">⏳ قيد الانتظار</option>
                  <option value="in_progress">✂️ قيد التنفيذ</option>
                  <option value="ready">✅ جاهز للتسليم</option>
                  <option value="delivered">📦 تم التسليم</option>
                  <option value="cancelled">❌ ملغي</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-200 font-bold mb-2 text-sm">السعر الإجمالي</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-lg font-black text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-left shadow-sm"
                  dir="ltr"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-slate-700 dark:text-slate-200 font-bold mb-2 text-sm">موعد التسليم</label>
                <input 
                  type="date"
                  value={deliveryDate}
                  onChange={e => {
                    setDeliveryDate(e.target.value);
                    setSelectedDays(null);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-base font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all mb-3 shadow-sm"
                />
                <div className="flex flex-wrap gap-2">
                  {[
                    { days: 1, label: 'يوم' },
                    { days: 2, label: 'يومان' },
                    { days: 7, label: 'أسبوع' },
                    { days: 14, label: 'أسبوعان' },
                    { days: 30, label: 'شهر' },
                  ].map(preset => (
                    <button 
                      key={preset.days}
                      type="button" 
                      onClick={() => setDeliveryDateByDays(preset.days)} 
                      className={cn(
                        "px-3.5 py-2 rounded-xl font-bold transition-colors text-xs shadow-sm border",
                        selectedDays === preset.days
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-indigo-500/30"
                          : "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Footer */}
          <div className="p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] z-20 relative">
            <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-lg py-3.5 rounded-2xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
              <Save size={22} />
              حفظ الطلب
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

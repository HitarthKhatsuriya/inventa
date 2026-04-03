# MediQ — Complete Mobile Application Generation Prompt
# Smart Hospital Queue & Appointment OS
# For Use in: Cursor / Replit / Claude / GPT-4 / Any AI Code Generator

---

## MASTER INSTRUCTION TO AI

You are building a complete, fully functional **React Native (Expo) mobile application** called **MediQ** — a Smart Hospital Appointment & Queue Management System. This is a **phone app**, not a web app. Every screen must be mobile-first, touch-friendly, and production-ready.

The app has **TWO sides**:
- **Patient App** (what patients use on their phone)
- **Hospital Staff App** (used by Reception, Doctors, and Admin on hospital tablets/phones)

Both sides run from the **same codebase** with role-based routing.

Do NOT skip any feature. Do NOT simplify any screen. Build everything described below exactly as written.

---

## TECH STACK — EXACT TOOLS TO USE

### Frontend (Mobile)
- **React Native + Expo** (SDK 50+)
- **React Navigation v6** (Stack + Bottom Tab + Drawer navigators)
- **NativeWind** (Tailwind for React Native) for styling
- **React Native Paper** for UI components
- **Expo Location** for geofencing
- **Expo Notifications** for push notifications
- **Lottie React Native** for animations
- **React Native Maps** for geo check-in visualization
- **Socket.io-client** for real-time WebSocket updates
- **Axios** for HTTP calls
- **React Native Razorpay** for payment integration
- **AsyncStorage** for local token/session storage
- **React Hook Form + Zod** for form validation
- **react-native-qrcode-svg** for QR code generation (patient side)
- **expo-camera + expo-barcode-scanner** for QR scanning (reception/doctor side)
- **expo-sharing + expo-print** for QR download/print to PDF

### Backend
- **Python 3.11 + FastAPI**
- **PostgreSQL** (primary database)
- **Redis** (queue state + caching)
- **SQLAlchemy** (ORM)
- **Alembic** (migrations)
- **WebSockets** (native FastAPI)
- **APScheduler** (morning forecast cron at 8 AM)
- **Twilio** (SMS fallback for non-smartphone users)
- **Firebase Cloud Messaging** (push notifications)
- **XGBoost + Scikit-learn** (ML models)
- **Pandas + NumPy** (data processing)
- **Razorpay Python SDK** (payment processing)
- **python-jose** (JWT auth)
- **bcrypt** (password hashing)
- **qrcode[pil]** (QR code generation on backend)
- **cryptography** (AES-256 encryption of QR payload)
- **Pydantic v2** (request/response schemas)

### Dataset
- **Kaggle: No-Show Appointments Dataset**
  URL: https://www.kaggle.com/datasets/joniarroba/noshowappointments
  Columns used: PatientId, AppointmentID, Gender, ScheduledDay, AppointmentDay, Age, Neighbourhood, Scholarship, Hipertension, Diabetes, Alcoholism, Handcap, SMS_received, No-show
  Use this to: Train no-show prediction model, derive consultation duration baselines, generate synthetic extended dataset

### Deployment
- **Railway.app** — Backend + PostgreSQL
- **Upstash** — Redis cloud
- **Expo EAS Build** — Mobile app build
- **Cloudinary** — Profile image storage

---

## DATABASE SCHEMA — BUILD ALL TABLES

```sql
-- Users table (patients + staff)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('patient', 'reception', 'doctor', 'admin')),
    age INTEGER,
    gender VARCHAR(10),
    address TEXT,
    neighbourhood VARCHAR(100),
    has_hypertension BOOLEAN DEFAULT FALSE,
    has_diabetes BOOLEAN DEFAULT FALSE,
    has_alcoholism BOOLEAN DEFAULT FALSE,
    has_handicap BOOLEAN DEFAULT FALSE,
    scholarship BOOLEAN DEFAULT FALSE,
    profile_image_url TEXT,
    fcm_token TEXT,
    location_consent BOOLEAN DEFAULT FALSE,
    otp_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Doctors table
CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    specialty VARCHAR(100) NOT NULL,
    default_duration_minutes INTEGER DEFAULT 15,
    avg_actual_duration FLOAT DEFAULT 15.0,
    speed_factor FLOAT DEFAULT 1.0,
    is_available BOOLEAN DEFAULT TRUE,
    break_start TIME,
    break_end TIME,
    working_hours_start TIME DEFAULT '09:00',
    working_hours_end TIME DEFAULT '18:00',
    room_number VARCHAR(10),
    last_heartbeat TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Appointments table
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES users(id),
    doctor_id UUID REFERENCES doctors(id),
    scheduled_time TIMESTAMP NOT NULL,
    actual_start_time TIMESTAMP,
    actual_end_time TIMESTAMP,
    predicted_duration_minutes FLOAT,
    actual_duration_minutes FLOAT,
    appointment_type VARCHAR(20) CHECK (appointment_type IN ('new', 'followup', 'emergency', 'walkin')),
    status VARCHAR(20) DEFAULT 'booked' CHECK (status IN (
        'booked', 'confirmed', 'checked_in', 'in_queue',
        'in_consultation', 'completed', 'no_show', 'cancelled', 'rescheduled'
    )),
    priority_level INTEGER DEFAULT 3 CHECK (priority_level IN (1,2,3)),
    fairness_score FLOAT DEFAULT 0.0,
    noshow_risk_score FLOAT,
    queue_position INTEGER,
    estimated_wait_minutes FLOAT,
    geo_checkin_fired BOOLEAN DEFAULT FALSE,
    checkin_time TIMESTAMP,
    cancellation_reason TEXT,
    notes TEXT,
    visit_reason TEXT,
    payment_id UUID REFERENCES payments(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES users(id),
    appointment_id UUID,
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    amount_total FLOAT NOT NULL,
    amount_paid FLOAT NOT NULL,
    amount_remaining FLOAT NOT NULL,
    payment_type VARCHAR(20) CHECK (payment_type IN ('half', 'full', 'remaining', 'refund')),
    payment_method VARCHAR(30) CHECK (payment_method IN ('upi', 'card', 'netbanking', 'wallet', 'cash')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'half_paid', 'fully_paid', 'refunded', 'failed')),
    payment_time TIMESTAMP,
    receipt_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Queue state table
CREATE TABLE queue_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES doctors(id),
    appointment_id UUID REFERENCES appointments(id),
    event_type VARCHAR(30) CHECK (event_type IN (
        'checked_in', 'consultation_start', 'consultation_end',
        'no_show_detected', 'emergency_insert', 'rescheduled',
        'cascade_fired', 'fairness_update'
    )),
    triggered_by VARCHAR(20),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    appointment_id UUID REFERENCES appointments(id),
    type VARCHAR(30),
    title VARCHAR(200),
    message TEXT,
    channel VARCHAR(10) CHECK (channel IN ('push', 'sms', 'both')),
    sent_at TIMESTAMP,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Forecasts table
CREATE TABLE daily_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forecast_date DATE NOT NULL,
    doctor_id UUID REFERENCES doctors(id),
    predicted_delay_minutes FLOAT,
    predicted_noshow_count INTEGER,
    confidence_score FLOAT,
    recommended_actions JSONB,
    is_special_day BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- QR Codes table
CREATE TABLE appointment_qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) UNIQUE NOT NULL,
    patient_id UUID REFERENCES users(id) NOT NULL,
    qr_token VARCHAR(256) UNIQUE NOT NULL,       -- AES-256 encrypted payload
    qr_image_url TEXT,                           -- Cloudinary hosted QR image
    is_used BOOLEAN DEFAULT FALSE,               -- One-time scan enforcement
    scanned_by UUID REFERENCES users(id),        -- Reception/Doctor who scanned
    scanned_at TIMESTAMP,
    scan_location VARCHAR(50),                   -- 'reception' | 'doctor_room'
    expires_at TIMESTAMP NOT NULL,               -- appointment_time + 2 hours
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add QR reference to appointments
ALTER TABLE appointments ADD COLUMN qr_code_id UUID REFERENCES appointment_qr_codes(id);

-- Doctor availability log
CREATE TABLE doctor_availability_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES doctors(id),
    status VARCHAR(20),
    reason TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);
```

---

## BACKEND — ALL API ENDPOINTS

### Auth Endpoints
```
POST   /auth/register          → Register patient, send OTP
POST   /auth/verify-otp        → Verify OTP, return JWT
POST   /auth/login             → Login, return JWT + role
POST   /auth/refresh           → Refresh JWT token
POST   /auth/logout            → Invalidate token
POST   /auth/forgot-password   → Send reset OTP
POST   /auth/reset-password    → Reset with OTP
```

### Patient Endpoints
```
GET    /patient/profile                     → Get own profile
PUT    /patient/profile                     → Update profile
GET    /patient/appointments                → All appointments (paginated)
GET    /patient/appointments/{id}           → Single appointment detail
GET    /patient/queue-status/{appt_id}      → Live queue position + ETA
GET    /patient/history                     → Past visits
POST   /patient/cancel/{appt_id}            → Cancel appointment
GET    /patient/notifications               → All notifications
PUT    /patient/notifications/{id}/read     → Mark as read
PUT    /patient/location-consent            → Accept/reject geo tracking
```

### Appointment Booking Endpoints
```
GET    /booking/doctors                     → List doctors by specialty
GET    /booking/doctors/{id}/slots          → Available slots for a doctor
GET    /booking/specialties                 → All specialties
POST   /booking/predict-duration            → ML prediction before booking
POST   /booking/predict-noshow              → No-show risk for patient
POST   /booking/book                        → Book appointment (returns payment order)
POST   /booking/walkin                      → Walk-in queue entry
```

### Payment Endpoints
```
POST   /payment/create-order               → Create Razorpay order (half amount)
POST   /payment/verify                     → Verify payment signature
POST   /payment/pay-remaining/{appt_id}    → Pay remaining at clinic
POST   /payment/refund/{appt_id}           → Refund on cancellation
GET    /payment/receipt/{payment_id}       → Download receipt
GET    /payment/history                    → Patient payment history
```

### Queue & Real-Time Endpoints
```
POST   /queue/checkin/{appt_id}            → Manual check-in
POST   /queue/geo-checkin                  → Geo-triggered auto check-in
GET    /queue/{doctor_id}                  → Full queue for a doctor
GET    /queue/eta/{appt_id}               → Personal ETA
POST   /queue/emergency                    → Insert emergency (P1)
WS     /ws/queue/{doctor_id}              → WebSocket live updates
WS     /ws/patient/{patient_id}           → Patient personal updates
```

### Doctor Dashboard Endpoints
```
GET    /doctor/dashboard                   → Today's stats + queue
POST   /doctor/start-consultation/{appt_id} → Start timer
POST   /doctor/end-consultation/{appt_id}   → End timer + trigger queue update
GET    /doctor/patient/{appt_id}/details    → Full patient profile
PUT    /doctor/availability                 → Set available/break/unavailable
GET    /doctor/history                      → Past consultations
POST   /doctor/notes/{appt_id}             → Add consultation notes
```

### Reception Dashboard Endpoints
```
GET    /reception/all-queues               → All doctors' queues
POST   /reception/checkin/{appt_id}        → Manual check-in at desk
POST   /reception/mark-noshow/{appt_id}    → Mark as no-show
POST   /reception/emergency-admit          → Create emergency entry
POST   /reception/walkin-book              → Walk-in booking
GET    /reception/waiting-room             → All checked-in patients
```

### Admin Dashboard Endpoints
```
GET    /admin/dashboard                    → Full system overview stats
GET    /admin/doctors                      → All doctor utilization
GET    /admin/forecast/today               → Today's AI forecast
GET    /admin/alerts                       → System flags (delays, no-shows)
GET    /admin/reports/daily                → Daily report PDF
GET    /admin/reports/weekly               → Weekly analytics
POST   /admin/cascade-override             → Manually trigger/cancel cascade
GET    /admin/payments/summary             → Payment analytics
```

### ML / Forecast Endpoints
```
POST   /ml/retrain                         → Trigger model retraining
GET    /forecast/today                     → Today's full forecast
GET    /forecast/doctor/{id}               → Per-doctor forecast
POST   /forecast/run                       → Manual forecast trigger
```

---

## QR CODE SYSTEM — COMPLETE SPECIFICATION

### How It Works (Full Flow)

```
1. Patient books appointment + pays 50% → QR generated automatically
2. QR contains encrypted payload (appointment_id + patient_id + timestamp + HMAC)
3. Patient sees QR on their app (always accessible, even offline as SVG)
4. Patient can also download/print QR as PDF
5. At hospital: Reception scans QR → instant verification screen appears
6. Screen shows: patient name, doctor, time, payment status, remaining amount
7. Reception taps "Check In" → queue updates in real-time
8. Doctor's room also has QR scanner → second verification at consultation door
9. QR is one-time use per location (reception scan ≠ doctor scan — both allowed)
10. QR expires 2 hours after appointment time
```

### QR Payload — Encrypted Structure
```python
# The raw payload (before encryption):
payload = {
    "appointment_id": "uuid",
    "patient_id": "uuid",
    "doctor_id": "uuid",
    "scheduled_time": "ISO8601",
    "issued_at": "ISO8601",
    "hmac": "sha256_signature"   # Prevents tampering
}

# Encryption:
# - AES-256-CBC encryption with server's QR_SECRET_KEY
# - Base64URL encode the encrypted bytes
# - This becomes the qr_token stored in DB and embedded in QR image

# QR image:
# - Generated using qrcode[pil] library
# - Error correction level: HIGH (can restore 30% of damaged QR)
# - Size: 300x300 pixels minimum
# - Uploaded to Cloudinary, URL stored in appointment_qr_codes table
```

### QR API Endpoints
```
GET    /qr/generate/{appointment_id}     → Generate/retrieve QR for appointment
GET    /qr/image/{appointment_id}        → Get QR image URL (Cloudinary)
POST   /qr/scan                          → Scan + verify QR token (staff only)
GET    /qr/verify/{token}                → Verify token validity without check-in
POST   /qr/regenerate/{appointment_id}   → Regenerate if expired (patient request)
```

### QR Scan Response — What Reception Sees Instantly
```json
{
  "valid": true,
  "appointment": {
    "id": "uuid",
    "patient_name": "Rahul Mehta",
    "patient_age": 34,
    "patient_phone": "+91XXXXXXXX",
    "doctor_name": "Dr. Priya Shah",
    "specialty": "Cardiology",
    "scheduled_time": "10:30 AM",
    "appointment_type": "Follow-up",
    "visit_reason": "Blood pressure checkup",
    "queue_position": 4,
    "estimated_wait": "~22 minutes"
  },
  "payment": {
    "status": "half_paid",
    "total_fee": 600,
    "amount_paid": 300,
    "amount_remaining": 300,
    "payment_method_used": "UPI",
    "remaining_can_pay": ["upi", "cash"]
  },
  "patient_flags": {
    "hypertension": true,
    "diabetes": false,
    "handicap": false
  },
  "checkin_status": "not_checked_in",
  "qr_previously_scanned_at": null,
  "actions_available": ["check_in", "collect_payment", "view_history", "mark_noshow"]
}
```

### QR Error Responses
```json
// Expired QR
{ "valid": false, "error": "QR_EXPIRED", "message": "This QR code expired at 12:30 PM. Ask patient to regenerate." }

// Wrong day
{ "valid": false, "error": "WRONG_DATE", "message": "This appointment is for tomorrow (April 4). Cannot check in today." }

// Already used at this location
{ "valid": false, "error": "ALREADY_SCANNED", "message": "Already checked in at reception at 10:15 AM by Staff Neha." }

// Tampered/invalid token
{ "valid": false, "error": "INVALID_TOKEN", "message": "QR code is invalid or has been tampered with." }

// Appointment cancelled
{ "valid": false, "error": "CANCELLED", "message": "This appointment was cancelled. Refund status: Processed." }

// Payment not done
{ "valid": false, "error": "PAYMENT_PENDING", "message": "Advance payment not completed. Cannot check in." }
```

---

## ML MODELS — BUILD BOTH

### Model 1: Consultation Duration Predictor
```python
# File: backend/ml_models/duration_model.py

# Input features:
# - doctor_id (encoded)
# - doctor_specialty (encoded)
# - doctor_speed_factor (learned from history)
# - patient_age
# - patient_gender
# - appointment_type (new=1, followup=0.6, emergency=1.5)
# - has_hypertension, has_diabetes, has_alcoholism, has_handicap (binary)
# - time_of_day (morning=0, afternoon=1, evening=2)
# - day_of_week (0-6)
# - is_special_day (boolean)

# Algorithm: XGBoost Regressor
# Output: predicted_duration_minutes (float)
# Fallback: specialty_defaults dict when model confidence < 0.6

SPECIALTY_DEFAULTS = {
    'general_medicine': 12,
    'cardiology': 20,
    'dermatology': 10,
    'psychiatry': 45,
    'orthopedics': 18,
    'pediatrics': 15,
    'gynecology': 20,
    'ophthalmology': 12,
    'default': 15
}

# Training data: Kaggle No-Show dataset + synthetic augmentation
# Save as: backend/ml_models/duration_model.pkl
```

### Model 2: No-Show Risk Predictor
```python
# File: backend/ml_models/noshow_model.py

# Input features (directly from Kaggle dataset columns):
# - age
# - gender (encoded)
# - scholarship
# - hipertension
# - diabetes
# - alcoholism
# - handcap
# - sms_received
# - days_in_advance (AppointmentDay - ScheduledDay)
# - neighbourhood (encoded)
# - appointment_type
# - time_of_day
# - past_noshow_count (from history)
# - past_total_appointments

# Algorithm: XGBoost Classifier
# Output: noshow_risk_score (0.0 to 1.0)
# Threshold: >0.7 = high risk → double-book safely + extra SMS

# Training: Use Kaggle dataset directly
# Target column: No-show (Yes=1, No=0)
# Save as: backend/ml_models/noshow_model.pkl
```

### Training Script
```python
# File: backend/ml_models/train.py
# Steps:
# 1. Load Kaggle CSV: KaggleV2-May-2016.csv
# 2. Clean + feature engineer
# 3. Augment with synthetic doctor behavior data (5000 records)
# 4. Train duration model on augmented data
# 5. Train no-show model on Kaggle data
# 6. Save both as .pkl files
# 7. Print accuracy metrics
# Run: python ml_models/train.py
```

---

## QUEUE ENGINE — CORE LOGIC

```python
# File: backend/queue_engine.py

class QueueEngine:

    def recalculate_queue(doctor_id):
        # 1. Get all appointments for doctor today with status in
        #    ['checked_in', 'in_queue', 'in_consultation']
        # 2. Sort by: priority_level ASC, fairness_score DESC, checkin_time ASC
        # 3. For patient in consultation: calculate elapsed time
        # 4. For each waiting patient:
        #    eta = sum(predicted_duration for patients ahead) 
        #          + (current_consultation_duration - elapsed_time)
        # 5. Update queue_position and estimated_wait_minutes
        # 6. Store in Redis with TTL 30 seconds
        # 7. Broadcast via WebSocket to all connected clients

    def detect_no_show(appointment_id):
        # If appointment status = 'checked_in' or 'in_queue'
        # AND checkin_time is NULL AND scheduled_time + 10 min passed
        # AND geo_checkin_fired = FALSE
        # → Mark as no_show → collapse gap → recalculate

    def update_fairness_scores(doctor_id):
        # Every 1 minute via background task
        # For each waiting patient: fairness_score += 1.0
        # If patient was pushed back by emergency: fairness_score += 2.0
        # Persist to PostgreSQL (not just Redis)
        # Trigger recalculate_queue

    def trigger_cascade_recovery(doctor_id):
        # Threshold: current delay > (specialty_avg * 0.20)
        # Get all not-yet-arrived patients (geo_checkin_fired = FALSE)
        # Last N patients: send SMS "Please arrive 45 min later"
        # Lock cascade for 45 minutes (Redis key)
        # Log event to queue_events

    def insert_emergency(doctor_id, patient_data):
        # Create appointment with priority_level = 1
        # Insert at position 1 in queue
        # Add fairness_score += 2.0 to all pushed-back patients
        # Broadcast with reason: "Emergency case prioritized"
        # Recalculate all ETAs

    def morning_forecast(date):
        # Runs via APScheduler at 08:00 every day
        # For each doctor:
        #   - Predict likely no-shows using noshow model
        #   - Predict delay probability from historical patterns
        #   - If special day (holiday/Sunday): use conservative defaults
        #   - confidence < 0.6: only soft suggestions, no hard changes
        # Save to daily_forecasts table
        # Notify admin via push notification
```

---

## GEOFENCING — EXACT IMPLEMENTATION

```javascript
// File: mobile/services/GeofenceService.js
// Uses: expo-location + expo-task-manager

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const GEOFENCE_TASK = 'MEDIQ_GEOFENCE';
const DWELL_TIME_MS = 90000; // 90 seconds minimum dwell
const RADIUS_METERS = 500;

// Register background task
TaskManager.defineTask(GEOFENCE_TASK, ({ data, error }) => {
    if (data.eventType === Location.GeofencingEventType.Enter) {
        // Start dwell timer
        // After 90 seconds: if still within radius → fire check-in
        // POST /queue/geo-checkin with { appointment_id, lat, lng }
    }
});

// Start geofencing for today's appointment
export const startGeofencing = async (appointment) => {
    // Check location_consent === true
    // If no consent: show consent modal first
    // If no GPS: send manual check-in prompt at T-15 minutes
    await Location.startGeofencingAsync(GEOFENCE_TASK, [{
        latitude: appointment.clinic_lat,
        longitude: appointment.clinic_lng,
        radius: RADIUS_METERS,
        notifyOnEnter: true,
        notifyOnExit: false
    }]);
};
```

---

## PAYMENT FLOW — COMPLETE IMPLEMENTATION

### The Rule
Every appointment requires **50% payment upfront** at booking (via Razorpay).
The remaining 50% is paid at the clinic (cash or UPI at reception).
**No payment = No confirmed booking.** This eliminates stale/ghost entries.

### Payment Options at Booking
Show these options on Payment Screen:
1. **UPI** (Google Pay, PhonePe, Paytm)
2. **Debit/Credit Card**
3. **Net Banking**
4. **Wallet** (Paytm Wallet, Amazon Pay)

### Cancellation Refund Policy
- Cancel 24+ hours before: 100% refund to source
- Cancel 2–24 hours before: 50% refund (25% of total fee)
- Cancel under 2 hours: No refund

### Backend Payment Flow
```python
# Step 1: Patient selects slot → POST /payment/create-order
# - Calculate total_fee based on doctor + appointment type
# - half_amount = total_fee / 2
# - Create Razorpay order for half_amount
# - Return { order_id, amount, currency, key_id }

# Step 2: Patient pays on app → Razorpay SDK handles UI
# - On success: POST /payment/verify
# - Verify HMAC signature
# - Update payment status = 'half_paid'
# - Confirm appointment status = 'confirmed'
# - Send confirmation SMS + push notification

# Step 3: Patient arrives at clinic
# - Reception dashboard shows "Remaining: ₹XXX"
# - POST /payment/pay-remaining/{appt_id}
# - Accept cash or UPI at desk
# - Update payment status = 'fully_paid'
```

---

## ALL MOBILE SCREENS — COMPLETE LIST

### PATIENT SIDE (Role: patient)

#### Screen 1: Splash Screen
- MediQ logo with Lottie animation
- Auto-navigate to Login if no token, else to Patient Home

#### Screen 2: Onboarding (3 slides)
- Slide 1: "Know your exact wait time" — illustration
- Slide 2: "Auto check-in when you're nearby" — illustration  
- Slide 3: "Never miss your turn" — illustration
- "Get Started" → Register screen

#### Screen 3: Register Screen
Form fields with validation:
- Full Name (required, min 2 chars)
- Phone Number (required, 10 digits, Indian format +91)
- Email (optional, valid email format)
- Age (required, 1–120)
- Gender (Radio: Male / Female / Other)
- Password (required, min 8 chars, 1 uppercase, 1 number)
- Confirm Password (must match)
- Address (optional)
- Medical flags: Hypertension / Diabetes / Alcoholism / Handicap (toggle switches)
- Scholarship (toggle)
- Location Permission consent toggle with explanation text:
  "MediQ uses your location only when you're near the clinic to auto-check you in. We never track you otherwise. Required under India's DPDP Act."
On submit: POST /auth/register → OTP sent to phone

#### Screen 4: OTP Verification Screen
- 6-digit OTP input (auto-focus next box)
- 60-second countdown resend timer
- Resend OTP button (active after countdown)
- Validation: exactly 6 digits, numeric only
- On verify: POST /auth/verify-otp → JWT stored in AsyncStorage

#### Screen 5: Login Screen
- Phone number input
- Password input (show/hide toggle)
- "Forgot Password?" link
- Login button
- "New Patient? Register" link
- Validation: phone 10 digits, password not empty

#### Screen 6: Forgot Password Screen
- Phone number input → send OTP
- OTP verify → New Password + Confirm Password form

#### Screen 7: Patient Home Screen (Main Tab)
Bottom tab navigator with 4 tabs:
1. Home
2. My Appointments
3. Queue Tracker
4. Profile

**Home Tab content:**
- Greeting card: "Good morning, [Name]"
- Active appointment card (if any today):
  - Doctor name + specialty
  - Queue position badge (e.g., "You are #3 in queue")
  - Live ETA countdown timer
  - "Check In" button (manual fallback)
  - Geo-check-in status badge: "Auto check-in active 🟢"
- "Book New Appointment" CTA button
- Upcoming appointments list (next 3)
- Health tips banner (static)
- Recent notifications list

#### Screen 8: Book Appointment — Step 1: Choose Specialty
- Search bar for specialty
- Grid of specialty cards with icons:
  General Medicine, Cardiology, Dermatology, Psychiatry, 
  Orthopedics, Pediatrics, Gynecology, Ophthalmology
- Each card shows: specialty name, icon, avg wait time today

#### Screen 9: Book Appointment — Step 2: Choose Doctor
- List of doctors for selected specialty
- Each doctor card shows:
  - Name, photo, rating
  - Today's schedule status (Available / Busy / Break)
  - Current queue length
  - Avg consultation time
  - "Preferred Doctor" star toggle
- Filter: by availability, by rating
- Select doctor → proceed to Step 3

#### Screen 10: Book Appointment — Step 3: Choose Time Slot
- Calendar date picker (next 7 days only)
- Time slots grid (30-min blocks, grayed out if unavailable)
- Each slot shows:
  - Time
  - Predicted wait after this slot
  - "HIGH RISK — may run late" badge (from morning forecast)
- Select slot → proceed to Step 4

#### Screen 11: Book Appointment — Step 4: Visit Details
Form:
- Reason for visit (text area, max 300 chars)
- Appointment type: New Visit / Follow-up (auto-selects based on history)
- Attach previous prescription (optional, image upload)
- AI duration prediction display: "Estimated: ~18 minutes"
- No-show risk indicator (shown as color: green/yellow/red)
Validation: reason required

#### Screen 12: Book Appointment — Step 5: Payment Screen
- Appointment summary card:
  - Doctor, specialty, date, time
  - Total consultation fee: ₹XXX
  - Advance payment (50%): ₹XXX (highlighted)
  - Remaining at clinic: ₹XXX
- Payment method selector:
  - UPI (enter UPI ID or QR scan)
  - Debit/Credit Card (card number, expiry, CVV)
  - Net Banking (bank dropdown)
  - Wallet (Paytm, Amazon Pay)
- Cancellation policy displayed clearly
- "Pay ₹XXX & Confirm" button
- Razorpay SDK opens on button press
- On success: navigate to Booking Confirmed screen
Validation:
- UPI ID: valid format (name@bank)
- Card: 16 digits, valid expiry (MM/YY), CVV 3 digits
- All payment methods validated before submission

#### Screen 13: Booking Confirmed Screen
- Lottie success animation
- Appointment ID (copyable)
- Receipt summary
- Payment receipt download button
- "Track My Queue" button → Queue Tracker tab
- "Go Home" button

#### Screen 14: My Appointments Screen
- Filter tabs: Upcoming / Completed / Cancelled
- Each appointment card:
  - Doctor, specialty, date, time
  - Status badge (color-coded)
  - Payment status badge
  - Queue position (for upcoming)
  - "Cancel" button (if cancellable)
  - "Pay Remaining" button (if half_paid + checked_in)
  - Tap to expand: full details + notes
- Empty state illustration for each tab

#### Screen 15: Queue Tracker Screen (MOST IMPORTANT)
- This screen is the REAL-TIME heart of the app
- WebSocket connected (show connection status dot)
- Large queue position display: "#3 in Queue"
- Circular progress countdown timer for ETA
- Doctor info card
- Queue visual: list of positions ahead (anonymized as "Patient A", "Patient B")
- Status flow:
  - "Not Checked In" → "Checked In ✅" → "In Queue 🟡" → "Your Turn 🟢"
- Geo check-in status: "Auto check-in will fire when within 500m"
- Manual check-in button (if geo fails)
- Live ETA: "~23 minutes remaining"
- Last updated timestamp
- Notification preference: "Notify me when I'm next" toggle
- "I'm leaving temporarily" button → pause fairness clock

#### Screen 16: Live Notification Screen
- Full list of all notifications
- Filter: All / Unread / ETA Updates / Payment
- Each notification card: icon, title, message, time
- Mark all as read button
- Delete notification

#### Screen 17: Patient Profile Screen
- Profile photo (upload/change via camera or gallery)
- Personal info (editable): name, email, phone, address, age, gender
- Medical info (editable): hypertension, diabetes toggles etc.
- Payment history list
- Location consent toggle (with DPDP explanation)
- Notification preferences:
  - Booking confirmation: ON/OFF
  - 24hr reminder: ON/OFF
  - 1hr reminder: ON/OFF
  - Live ETA updates: ON/OFF
  - ETA change threshold: 5 / 10 / 15 / 30 minutes
- Change password
- Logout (with confirmation dialog)
- Delete account (with confirmation + reason)

#### Screen 18: Appointment Detail Screen
- Full appointment info
- Timeline: Booked → Confirmed → Checked In → In Queue → Completed
- Payment breakdown
- Doctor notes (visible after completion)
- Rate your experience (1–5 stars + comment, after completed)
- Share appointment details button

#### Screen 19: My QR Code Screen (NEW)
Accessible from: Home active appointment card → "Show QR" button, AND from Appointment Detail screen

**Layout:**
- Header: "Your Appointment QR Code"
- Subtext: "Show this to reception when you arrive"
- Large QR code (300x300, centered, high contrast)
- Below QR:
  - Appointment ID (short form, e.g. #MQ-4821)
  - Doctor name + specialty
  - Date + Time
  - Payment status badge:
    - 🟡 "₹300 remaining at clinic" (if half_paid)
    - 🟢 "Fully Paid" (if fully_paid)
    - Remaining amount shown prominently in red if due
- Action buttons row:
  - "Download QR" → saves to phone gallery as image
  - "Print / Share PDF" → expo-print generates PDF with QR + appointment summary
  - "Regenerate" → only if QR is expired (with confirmation dialog)
- Offline support: QR SVG rendered client-side — works without internet
- Brightness auto-boost when screen opens (for easy scanning)
- "What if I don't have my phone?" help text → explains manual check-in with ID

---

### HOSPITAL SIDE (Roles: reception, doctor, admin)

#### Screen 19: Staff Login Screen
- Phone + Password
- Role is detected from backend (no role selector)
- Different home screen based on role
- "Forgot password" link

#### Screen 20: Reception Dashboard
Bottom tabs: Queue View / Check-In / Walk-Ins / Payments

**Queue View Tab:**
- All doctors' queues in horizontal scroll cards
- Each doctor card shows:
  - Doctor name + specialty + availability status
  - Queue count (checked_in + in_queue)
  - Current patient (name + time elapsed)
  - Delay indicator (green/yellow/red)
  - Tap to expand full queue list
- Global alerts banner: "Dr. Shah running 25 min late ⚠️"
- Emergency admit button (red, prominent)

**Check-In Tab:**
- Search by patient name or phone
- Upcoming appointments list for today
- Each row: patient name, doctor, time, payment status
- "Check In" button per row
- Batch check-in for groups
- No-show button (marks absent after 10 min)

**Walk-In Tab:**
- Walk-in booking form:
  - Patient phone search (existing) or quick register
  - Specialty selector
  - Doctor selector (filtered by specialty)
  - Reason (optional)
  - Appointment type: Walk-in
- Automatic assignment to shortest queue
- No payment required for walk-in? OR: collect full payment at desk (option)

**Payments Tab:**
- Today's payment summary: Total collected / Pending remaining
- List of appointments with remaining balance
- "Collect Remaining" button per appointment
- Cash collection recorder
- Daily cash summary

#### Screen 21: Doctor Dashboard
Bottom tabs: My Queue / Current Patient / Schedule / Profile

**My Queue Tab:**
- Live ordered list of today's patients
- Each patient row:
  - Queue number, name, age, visit type
  - Predicted duration badge
  - Wait time so far
  - Medical flags icons (hypertension, diabetes etc.)
- "Start Consultation" button (for next patient)
- Current time elapsed bar for active consultation
- "End Consultation" button (prominent, green)

**Current Patient Tab:**
- Active patient full profile
- Medical history flags
- Visit reason
- Previous visits summary
- Add notes text area
- Prescription quick template buttons
- "End Consultation" button

**Schedule Tab:**
- Today's full schedule timeline
- Past (greyed), current (highlighted), upcoming (white)
- Set availability: Available / Break / Unavailable
- Break time picker
- View tomorrow's forecast card

**Doctor Profile Tab:**
- Personal stats:
  - Avg consultation time (today, this week)
  - Utilization % (today)
  - Patient satisfaction score (from ratings)
  - No-show rate for my patients
- Notification settings

#### Screen 22: Admin Dashboard
Bottom tabs: Overview / Doctors / Forecast / Reports / Alerts

**Overview Tab:**
- Live stats cards:
  - Total appointments today
  - Checked in count
  - In consultation count
  - Completed count
  - No-shows count
  - Total revenue today (paid)
  - Pending payments
- Mini queue chart per doctor (bar chart)
- System health indicator (WebSocket connections, Redis status)
- Last model training date

**Doctors Tab:**
- All doctors list
- Each doctor card:
  - Utilization % (progress bar)
  - Avg actual duration vs predicted (variance %)
  - Current delay (minutes behind)
  - Queue load (patients waiting)
  - Status badge
- Sort by: delay, utilization, queue length
- Tap doctor → Doctor detail modal:
  - Full today's timeline
  - Historical performance chart (7 days)
  - Per-specialty average durations

**Forecast Tab (Morning AI Forecast):**
- Header: "AI Forecast for Today — Generated at 08:00 AM"
- Confidence score badge (e.g., "82% confident")
- Per-doctor forecast cards:
  - Predicted delay probability
  - Predicted no-show count
  - Recommended actions:
    - "Consider overbooking 1 slot for Dr. Patel"
    - "Alert patients of Dr. Shah: possible 20 min delay"
  - Confidence level (if <60%: "Soft suggestion only")
- Special day flag: "Today is a public holiday — conservative defaults applied"
- Historical forecast accuracy: "Last 7 days: 78% accurate"
- Manual override buttons per recommendation

**Reports Tab:**
- Date range picker
- Report types:
  - Daily summary (PDF export)
  - Weekly analytics chart
  - No-show trends chart
  - Revenue summary
  - Doctor performance comparison
  - Patient wait time distribution
- Export buttons: PDF / CSV

**Alerts Tab:**
- All system flags in real-time:
  - "Dr. Patel: No heartbeat for 25 min — possibly unavailable ⚠️"
  - "Cascade recovery fired for Dr. Shah queue ⚠️"
  - "5 no-shows detected today 🔴"
  - "Payment pending for 3 checked-in patients 🟡"
- Acknowledge button per alert
- Alert history (last 48 hours)
- Push notification settings for alerts

#### Screen 23: QR Scanner Screen (NEW — Reception + Doctor)
Accessible from: Reception Dashboard top-right scan icon, Doctor Dashboard "Scan Patient" button

**Layout:**
- Full-screen camera view with scan frame overlay
- Animated scan line moving top to bottom
- "Point camera at patient's QR code" instruction text
- Torch toggle button (for low-light environments)
- Manual entry fallback: "Enter Appointment ID manually" link

**On successful scan — Result Card slides up from bottom:**

If valid:
- ✅ Green header: "Valid Appointment"
- Patient photo + name + age
- Doctor name + scheduled time
- Queue position + ETA
- Payment status section:
  - If half_paid: 🟡 "₹300 remaining" with "Collect Now" button
  - If fully_paid: 🟢 "Payment Complete"
- Medical flags row: 🔴 Hypertension | 🟡 Diabetes (colored icons)
- Visit reason
- Action buttons:
  - "✅ Check In" (primary, green) — triggers queue update
  - "💳 Collect Payment" (if remaining > 0)
  - "❌ Mark No-Show"
  - "📋 View Full History"
- After Check In tapped: confirmation animation + "Patient added to queue at position #4"

If invalid:
- ❌ Red header: error type
- Clear error message
- Suggested action (e.g., "Ask patient to regenerate QR")
- "Scan Again" button

**Doctor Room Scanner (slight variation):**
- Same scanner UI
- Result card shows: patient name, visit reason, medical flags, previous notes
- Action: "Start Consultation" button (instead of Check In)
- No payment actions (doctor doesn't handle payments)

#### Screen 24: Emergency Admit Screen (accessible from Reception)
- Patient search (existing) or quick entry
- Emergency level selector: P1 (Critical) / P2 (Urgent) / P3 (Priority)
- Reason text (required)
- Doctor selector (filtered by specialty)
- One-tap admit → inserts to front of queue
- Broadcast to all screens immediately

#### Screen 24: Cascade Recovery Control Screen (Admin)
- Current cascade status per doctor
- Manual trigger: "Send rescheduling SMS to last N patients"
- N selector (1–10)
- Preview: which patients will receive SMS before sending
- Cascade lock timer display
- History: past cascades fired today

---

## VALIDATION RULES — ALL FIELDS

### Registration
- Name: required, 2–100 chars, no special characters except space and dot
- Phone: required, exactly 10 digits, starts with 6/7/8/9
- Email: valid RFC 5322 email or empty
- Age: required, integer 1–120
- Password: min 8 chars, at least 1 uppercase, 1 lowercase, 1 number
- Confirm Password: must exactly match password

### Booking
- Specialty: must select from list
- Doctor: must select from list
- Date: must be today or future, max 7 days ahead
- Time slot: must be available (not booked or passed)
- Visit reason: required, 10–300 characters
- Appointment type: required

### Payment
- UPI ID: regex pattern ^[a-zA-Z0-9._-]+@[a-zA-Z]+$
- Card number: exactly 16 digits, Luhn algorithm check
- Expiry: MM/YY format, must be future date
- CVV: exactly 3 digits (4 for Amex)
- Amount: must match server-calculated amount (anti-tamper)

### Doctor/Staff
- Consultation notes: max 2000 characters
- Break time: end time must be after start time
- Break must be within working hours

### General
- All text inputs: XSS sanitization
- All IDs: UUID v4 format validation
- All timestamps: ISO 8601 format
- Phone numbers: always stored with country code +91

---

## REAL-TIME WEBSOCKET EVENTS

```javascript
// Events the server broadcasts:
{
  event: 'queue_update',
  doctor_id: 'uuid',
  queue: [...],          // Full ordered queue
  updated_at: 'timestamp'
}

{
  event: 'eta_update',
  patient_id: 'uuid',
  new_eta_minutes: 23,
  position: 3,
  reason: 'consultation_ended' // or 'no_show_detected' etc.
}

{
  event: 'emergency_inserted',
  doctor_id: 'uuid',
  message: 'An emergency case was prioritized. Your estimated wait has increased.',
  new_eta_minutes: 35
}

{
  event: 'cascade_fired',
  doctor_id: 'uuid',
  affected_patient_ids: ['uuid1', 'uuid2'],
  message: 'Please arrive 45 minutes later. The schedule has been adjusted.'
}

{
  event: 'your_turn_soon',
  patient_id: 'uuid',
  message: 'You are next! Please return to the waiting area.'
}

{
  event: 'consultation_started',
  appointment_id: 'uuid',
  patient_id: 'uuid'
}

{
  event: 'noshow_detected',
  appointment_id: 'uuid',
  queue_collapsed: true
}
```

---

## NOTIFICATION & VOICE CALL SYSTEM — COMPLETE DEEP SPECIFICATION

### Architecture Overview
```
NotificationEngine (backend/notification_engine.py)
    ├── PushService       → Firebase Cloud Messaging (FCM)
    ├── SMSService        → Twilio SMS API
    ├── VoiceCallService  → Twilio Programmable Voice (TwiML)
    ├── InAppService      → WebSocket real-time in-app alerts
    └── NotificationRouter → Decides channel per user per event
```

### Channel Selection Logic
```python
# backend/notification_engine.py

class NotificationRouter:
    def route(self, user_id, event_type, payload):
        user = get_user(user_id)
        prefs = get_notification_prefs(user_id)

        channels = []

        # Rule 1: No smartphone → SMS + Voice only
        if user.no_smartphone:
            channels = ['sms']
            if event_type in VOICE_CALL_EVENTS:
                channels.append('voice_call')
            return channels

        # Rule 2: Push failed last 2 times → fallback to SMS
        if user.push_failure_count >= 2:
            channels.append('sms')
        else:
            channels.append('push')

        # Rule 3: Critical events always get SMS too
        if event_type in CRITICAL_EVENTS:
            if 'sms' not in channels:
                channels.append('sms')

        # Rule 4: Voice call events
        if event_type in VOICE_CALL_EVENTS and prefs.voice_calls_enabled:
            channels.append('voice_call')

        # Rule 5: Always in-app for connected users
        channels.append('in_app')

        # Rule 6: Respect user preferences
        if not prefs.sms_enabled and 'sms' in channels:
            if event_type not in MANDATORY_EVENTS:
                channels.remove('sms')

        return channels

CRITICAL_EVENTS = [
    'appointment_confirmed', 'cascade_reschedule', 'emergency_queue_push',
    'appointment_cancelled', 'your_turn_now', 'payment_confirmation',
    'doctor_unavailable', 'appointment_rescheduled_by_hospital'
]

VOICE_CALL_EVENTS = [
    'cascade_reschedule', 'appointment_rescheduled_by_hospital',
    'doctor_unavailable_reschedule', 'critical_delay_alert',
    'your_turn_now_voice', 'payment_due_final_reminder'
]

MANDATORY_EVENTS = [
    'appointment_confirmed', 'appointment_cancelled',
    'emergency_queue_push', 'cascade_reschedule'
]
```

---

### PATIENT NOTIFICATIONS — ALL EVENTS (DETAILED)

#### 1. Booking Confirmed
```
Channels: Push + SMS
Trigger: POST /payment/verify succeeds

Push Title: "Appointment Confirmed ✅"
Push Body: "Dr. {doctor_name} on {date} at {time}. Your queue slot is #{position}. Advance paid: ₹{amount}."
Push Data: { screen: 'AppointmentDetail', appointment_id: 'uuid' }

SMS: "MediQ: Your appointment with Dr. {name} ({specialty}) is confirmed for {date} at {time}.
Appointment ID: #{short_id}. Advance paid: ₹{amount}. Remaining ₹{remaining} due at clinic.
Show your QR code at reception. Download app: {link}"

In-App: Green banner with doctor photo, time, queue number
```

#### 2. Payment Receipt
```
Channels: Push + In-App
Trigger: Payment verified

Push Title: "Payment Successful 💳"
Push Body: "₹{amount} paid via {method}. Remaining ₹{remaining} due at clinic. Receipt saved."
Push Data: { screen: 'PaymentReceipt', payment_id: 'uuid' }

In-App: Receipt card with download button
```

#### 3. 24-Hour Reminder
```
Channels: Push + SMS
Trigger: APScheduler — 24 hrs before appointment_time

Push Title: "Appointment Tomorrow 🏥"
Push Body: "Dr. {name} at {time} tomorrow. Tap to see your QR code and live queue status."
Push Data: { screen: 'MyQRCode', appointment_id: 'uuid' }

SMS: "MediQ Reminder: You have an appointment with Dr. {name} tomorrow at {time}.
Hospital: {clinic_name}, {address}. Show QR at reception.
Need to cancel? Reply CANCEL or call {hospital_phone}."
```

#### 4. 1-Hour Reminder
```
Channels: Push + SMS
Trigger: APScheduler — 1 hr before appointment_time

Push Title: "Your appointment is in 1 hour ⏰"
Push Body: "Dr. {name} at {time}. Current queue: {count} patients ahead. Predicted wait: ~{eta} min."

SMS: "MediQ: Your appointment with Dr. {name} is in 1 hour ({time}).
Current estimated wait: {eta} minutes. Please arrive on time.
Your position in queue: #{position}."
```

#### 5. Geo Check-In Fired
```
Channels: Push (only)
Trigger: GeofenceService detects 90s dwell within 500m

Push Title: "Auto Check-In Complete 📍"
Push Body: "Welcome! You've been automatically checked in for Dr. {name}. You are #${position} in queue. Estimated wait: ~{eta} min."
Push Data: { screen: 'QueueTracker', appointment_id: 'uuid' }

In-App: Animated green checkmark on Queue Tracker screen
```

#### 6. Queue Position = 5 (Early Warning)
```
Channels: Push
Trigger: queue_engine.recalculate_queue() → position becomes 5

Push Title: "Getting closer! You're #5 in queue 🔔"
Push Body: "Dr. {name} — approximately {eta} minutes remaining. Start making your way to the waiting area."
```

#### 7. Queue Position = 3
```
Channels: Push + In-App Alert
Trigger: queue_engine → position = 3

Push Title: "Almost your turn! #3 in queue 🟡"
Push Body: "~{eta} minutes left. Please be in the waiting room now."

In-App: Pulsing yellow banner on Queue Tracker
```

#### 8. Queue Position = 1 (YOUR TURN NEXT)
```
Channels: Push (HIGH PRIORITY) + SMS + Voice Call (if enabled)
Trigger: queue_engine → position = 1

Push Title: "⚡ You're NEXT! Go to Room {room_number}"
Push Body: "Dr. {name} will call you in approximately {eta} minutes. Please be at Room {room_number} now."
Push Priority: HIGH (bypasses Do Not Disturb on Android)

SMS: "MediQ URGENT: You are NEXT for Dr. {name}. Please go to Room {room_number} immediately.
If you're not in the building, call reception: {reception_phone}."

Voice Call Script (TwiML):
"Hello, this is MediQ calling for {patient_name}.
You are next in line for your appointment with Doctor {doctor_name}.
Please proceed to Room {room_number} immediately.
If you are not currently at the hospital, please call reception at {phone}.
Thank you. Goodbye."
```

#### 9. ETA Changed — Significant Shift
```
Channels: Push + SMS (only if shift > 15 minutes)
Trigger: queue_engine detects ETA delta > 15 min

Push Title: "Wait time updated ⏱"
Push Body: "Your new estimated wait is ~{new_eta} min (was {old_eta} min). Reason: {reason_text}."

reason_text values:
- "A consultation ran longer than expected"
- "An emergency case was prioritized"  
- "A patient did not show up — queue moved forward"
- "Doctor resumed after a short break"

SMS (only if push fails OR shift > 30 min):
"MediQ Update: Your wait time changed to ~{new_eta} minutes (was {old_eta} min).
Reason: {reason}. New estimated time: {new_clock_time}."
```

#### 10. Emergency Inserted — You Got Pushed Back
```
Channels: Push + In-App
Trigger: queue_engine.insert_emergency()

Push Title: "Queue Update — Emergency Case 🚨"
Push Body: "An emergency patient was prioritized. Your new wait is ~{new_eta} min. Your fairness score has been boosted — you won't be pushed back again soon."

In-App: Red banner with explanation + new ETA
```

#### 11. Cascade Reschedule — Come Later
```
Channels: Push + SMS + Voice Call
Trigger: queue_engine.trigger_cascade_recovery() — patient not yet arrived

Push Title: "Schedule Change — Please come later 📅"
Push Body: "Dr. {name} is running behind. Your new suggested arrival time is {new_time}. Your slot is secured."

SMS: "MediQ IMPORTANT: Dr. {name} is running approximately {delay} minutes behind schedule.
We recommend you arrive at {new_time} instead.
Your appointment slot is SECURED. No action needed.
Questions? Call: {hospital_phone}."

Voice Call Script (TwiML):
"Hello, this is MediQ Hospital calling for {patient_name}.
This is an important message regarding your appointment today with Doctor {doctor_name}.
The doctor is currently running approximately {delay} minutes behind schedule.
We recommend you arrive at {new_time} instead of your original time.
Your appointment slot is fully secured. No action is required on your part.
If you have any questions, please call our reception at {phone}.
We apologize for the inconvenience. Thank you."
```

#### 12. Appointment Rescheduled by Hospital
```
Channels: Push + SMS + Voice Call (MANDATORY)
Trigger: Admin/Reception reschedules appointment from dashboard

Push Title: "Appointment Rescheduled 📅"
Push Body: "Your appointment with Dr. {name} has been moved to {new_date} at {new_time}. Tap to confirm or request a different slot."

SMS: "MediQ: Your appointment (ID #{short_id}) with Dr. {name} has been rescheduled.
New time: {new_date} at {new_time}.
Reason: {reason}.
To confirm reply YES. To request change call: {phone} or visit app."

Voice Call Script:
"Hello, this is MediQ calling for {patient_name}.
Your appointment with Doctor {doctor_name}, originally scheduled for {old_date} at {old_time},
has been rescheduled to {new_date} at {new_time}.
The reason is: {reason}.
To confirm this new time, please reply YES to our SMS.
To request a different time, please call our reception at {phone}.
Thank you and we apologize for any inconvenience."
```

#### 13. Doctor Unavailable — Appointment Needs Rebooking
```
Channels: Push + SMS + Voice Call
Trigger: Admin marks doctor unavailable + has patients booked

Push Title: "Doctor Unavailable Today 🏥"
Push Body: "Dr. {name} is unavailable today. Please rebook with another available doctor. No charge for rebooking."

SMS: "MediQ: Unfortunately Dr. {name} is unavailable for your appointment today.
Please rebook at no extra charge. Call {phone} or use the app.
We sincerely apologize."

Voice Call Script:
"Hello, this is MediQ Hospital calling for {patient_name}.
We regret to inform you that Doctor {doctor_name} is unavailable today
and your appointment at {time} cannot proceed as scheduled.
We sincerely apologize for this inconvenience.
Please use the MediQ app or call us at {phone} to rebook at no additional charge.
Your advance payment will be fully retained for the new booking.
Thank you for your patience."
```

#### 14. Appointment Cancelled by Patient
```
Channels: Push + SMS
Trigger: POST /patient/cancel/{appt_id}

Push Title: "Appointment Cancelled"
Push Body: "Your appointment with Dr. {name} on {date} has been cancelled. Refund: ₹{refund_amount} in 3–5 business days."

SMS: "MediQ: Appointment #{short_id} with Dr. {name} on {date} at {time} has been cancelled.
Refund of ₹{refund_amount} will be credited in 3-5 business days to your original payment method.
Book again anytime at {app_link}."
```

#### 15. Payment Remaining Due (At Check-In)
```
Channels: Push + In-App
Trigger: QR scan → check-in → payment status = half_paid

Push Title: "Payment Due at Reception 💳"
Push Body: "Please pay the remaining ₹{amount} at the reception counter before your consultation."

In-App: Yellow banner with "Pay Now" button (opens payment options)
```

#### 16. Consultation Complete
```
Channels: Push
Trigger: POST /doctor/end-consultation

Push Title: "Consultation Complete ✅"
Push Body: "Your visit with Dr. {name} is complete. Please collect any prescriptions and visit the pharmacy if needed."

Follow-up push 2 hours later:
Push Title: "How was your experience? ⭐"
Push Body: "Please rate your visit with Dr. {name}. Your feedback helps us improve."
Push Data: { screen: 'RateExperience', appointment_id: 'uuid' }
```

#### 17. No-Show Warning (If they come back)
```
Channels: Push + SMS
Trigger: Appointment marked no-show BUT patient later arrives (geo fires late)

Push Title: "You were marked as No-Show"
Push Body: "You were marked absent. Please go to reception immediately to reinstate your appointment. Queue position subject to availability."

SMS: "MediQ: You were marked as no-show for your {time} appointment with Dr. {name}.
If you are at the hospital, please visit reception immediately.
Your slot may still be available."
```

#### 18. Morning Forecast Notification (Patient)
```
Channels: Push (optional, user can disable)
Trigger: Morning forecast generated at 08:00 AM — only if patient has today's appointment

Push Title: "Today's Queue Forecast 🌅"
Push Body: "Dr. {name} at {time} — AI predicts {delay_text}. {recommendation}."

delay_text examples:
- "likely to run on time today"
- "may run 15–20 min late"
- "high no-show day — you may move up faster"

recommendation examples:
- "Arrive at your scheduled time."
- "Consider arriving 15 min after your slot."
```

---

### HOSPITAL STAFF NOTIFICATIONS — ALL EVENTS (DETAILED)

#### Staff Notification Channels
- **Push** (FCM to staff device)
- **In-App** (WebSocket real-time dashboard alert)
- **Dashboard Alert Banner** (persistent until acknowledged)

#### 19. New Patient Checked In (Reception)
```
Channels: Push (reception) + In-App
Trigger: Any check-in event (manual, QR, or geo)

Push Title: "Patient Checked In 📋"
Push Body: "{patient_name} has checked in for Dr. {doctor_name}. Queue position: #{position}."
```

#### 20. No-Show Detected (Reception + Doctor)
```
Channels: Push + In-App Dashboard Banner
Trigger: queue_engine.detect_no_show()

Push Title: "No-Show Detected ⚠️"
Push Body: "{patient_name} (#{position}) has been marked as no-show. Queue collapsed. Next patient pulled forward."

Dashboard Banner: Red banner — "No-show: {name} | Slot collapsed | Queue updated"
```

#### 21. Doctor Running Late Alert (Reception + Admin)
```
Channels: Push + In-App
Trigger: queue_engine detects doctor's actual avg > predicted * 1.20

Push Title: "Dr. {name} Running Late ⚠️"
Push Body: "Current delay: {delay} minutes. {patients_affected} patients affected. Consider triggering cascade recovery."

Dashboard: Yellow flashing card on doctor's queue section
Action buttons: "Trigger Cascade Now" | "Dismiss"
```

#### 22. Cascade Recovery Triggered (Admin + Reception)
```
Channels: Push + In-App
Trigger: queue_engine.trigger_cascade_recovery()

Push Title: "Cascade Recovery Fired 🔄"
Push Body: "{count} patients notified to arrive later for Dr. {name}. Cascade lock active for 45 minutes."

Dashboard Alert: "CASCADE ACTIVE — Dr. {name} | {count} patients rescheduled | Locked until {unlock_time}"
```

#### 23. Emergency Patient Admitted (All Staff)
```
Channels: Push (ALL staff logged in) + In-App
Trigger: POST /reception/emergency-admit

Push Title: "⚡ Emergency Admitted — {priority_label}"
Push Body: "{patient_name} | {reason} | Assigned to Dr. {name} | Room {room}. All queues updated."

priority_label: "P1 CRITICAL" / "P2 URGENT" / "P3 PRIORITY"
Dashboard: Red flashing banner across all dashboards
```

#### 24. Doctor Heartbeat Lost (Admin)
```
Channels: Push (admin only) + Dashboard Alert
Trigger: No consultation activity for DOCTOR_HEARTBEAT_TIMEOUT_MINUTES

Push Title: "Doctor Possibly Unavailable ⚠️"
Push Body: "Dr. {name} has had no activity for {minutes} minutes during active hours. Please verify availability."

Dashboard Alert: "HEARTBEAT LOST — Dr. {name} | Last active: {time_ago} | Verify status"
Action: "Mark Available" | "Mark on Break" | "Mark Unavailable"
```

#### 25. Walk-In Patient Added (Doctor)
```
Channels: Push (doctor) + In-App
Trigger: Reception adds walk-in to doctor's queue

Push Title: "Walk-In Added to Your Queue 👤"
Push Body: "{patient_name}, {age}/{gender} — {reason}. Added at end of queue. Total queue: {count} patients."
```

#### 26. Payment Pending at Check-In (Reception)
```
Channels: In-App only
Trigger: QR scan result shows half_paid status

In-App: Yellow indicator on patient row — "₹{remaining} due — Collect before consultation"
```

#### 27. Daily Report Ready (Admin)
```
Channels: Push
Trigger: APScheduler — 10:00 PM daily

Push Title: "Today's Report Ready 📊"
Push Body: "{total} appointments | {completed} completed | {noshow} no-shows | ₹{revenue} collected. Tap to view."
Push Data: { screen: 'AdminReports', date: 'today' }
```

#### 28. Model Retrain Complete (Admin)
```
Channels: Push
Trigger: Weekly retraining job (Monday 2 AM)

Push Title: "AI Models Updated 🤖"
Push Body: "No-show model accuracy: {accuracy}%. Duration model MAE: {mae} min. Models updated successfully."
```

#### 29. Morning Forecast Ready (Admin + Reception)
```
Channels: Push
Trigger: APScheduler 08:00 AM

Push Title: "Today's AI Forecast Ready 🌅"
Push Body: "{high_risk_count} high-risk no-shows predicted. {delay_count} doctors may run late. Tap to review."
Push Data: { screen: 'AdminForecast' }
```

#### 30. QR Scan Anomaly (Admin)
```
Channels: Push + Dashboard Alert
Trigger: Invalid/expired/tampered QR scanned more than 3 times

Push Title: "QR Security Alert 🔐"
Push Body: "Suspicious QR scan activity for appointment #{short_id}. {count} failed attempts. Patient: {name}."
Dashboard: Orange security alert with scan log
```

---

### VOICE CALL ENGINE — DEEP IMPLEMENTATION

```python
# backend/voice_call_service.py
# Uses: Twilio Programmable Voice + TwiML

from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse, Say, Pause
import os

class VoiceCallService:

    def __init__(self):
        self.client = Client(
            os.getenv('TWILIO_ACCOUNT_SID'),
            os.getenv('TWILIO_AUTH_TOKEN')
        )
        self.from_number = os.getenv('TWILIO_PHONE')
        self.language = 'en-IN'     # Indian English accent
        self.voice = 'Polly.Aditi'  # AWS Polly Indian female voice via Twilio

    def make_call(self, to_phone: str, twiml_script: str, 
                  appointment_id: str, call_type: str):
        """
        Makes outbound call.
        Logs call attempt to voice_call_logs table.
        Retries once after 3 minutes if no answer.
        Falls back to SMS if both attempts fail.
        """
        call = self.client.calls.create(
            to=f'+91{to_phone}',
            from_=self.from_number,
            twiml=twiml_script,
            status_callback=f'{os.getenv("API_BASE_URL")}/calls/status',
            status_callback_event=['initiated', 'ringing', 'answered', 'completed'],
            timeout=30,   # Ring for 30 seconds before no-answer
            machine_detection='Enable'  # Detects voicemail
        )
        log_call_attempt(appointment_id, call.sid, call_type)
        return call.sid

    def build_your_turn_script(self, patient_name, doctor_name, room_number, eta_minutes):
        response = VoiceResponse()
        response.say(
            f"Hello, this is MediQ Hospital calling for {patient_name}.",
            voice=self.voice, language=self.language
        )
        response.pause(length=1)
        response.say(
            f"You are next in line for your appointment with Doctor {doctor_name}.",
            voice=self.voice, language=self.language
        )
        response.say(
            f"Please proceed to Room {room_number} immediately.",
            voice=self.voice, language=self.language
        )
        response.pause(length=1)
        response.say(
            f"If you are not currently at the hospital, please call reception immediately.",
            voice=self.voice, language=self.language
        )
        response.say("Thank you. Goodbye.", voice=self.voice, language=self.language)
        return str(response)

    def build_cascade_script(self, patient_name, doctor_name, 
                              delay_minutes, new_arrival_time, reception_phone):
        response = VoiceResponse()
        response.say(
            f"Hello, this is MediQ Hospital calling for {patient_name}.",
            voice=self.voice, language=self.language
        )
        response.pause(length=1)
        response.say(
            "This is an important message regarding your appointment today.",
            voice=self.voice, language=self.language
        )
        response.say(
            f"Doctor {doctor_name} is currently running approximately "
            f"{delay_minutes} minutes behind schedule.",
            voice=self.voice, language=self.language
        )
        response.pause(length=1)
        response.say(
            f"We recommend you arrive at {new_arrival_time} instead of your original time.",
            voice=self.voice, language=self.language
        )
        response.say(
            "Your appointment slot is fully secured. No action is required on your part.",
            voice=self.voice, language=self.language
        )
        response.pause(length=1)
        response.say(
            f"For questions, please call our reception at {reception_phone}.",
            voice=self.voice, language=self.language
        )
        response.say(
            "We apologize for the inconvenience. Thank you.",
            voice=self.voice, language=self.language
        )
        return str(response)

    def build_reschedule_script(self, patient_name, doctor_name,
                                 old_datetime, new_datetime, reason, reception_phone):
        response = VoiceResponse()
        response.say(
            f"Hello, this is MediQ Hospital calling for {patient_name}.",
            voice=self.voice, language=self.language
        )
        response.pause(length=1)
        response.say(
            f"Your appointment with Doctor {doctor_name}, "
            f"originally scheduled for {old_datetime}, "
            f"has been rescheduled to {new_datetime}.",
            voice=self.voice, language=self.language
        )
        response.say(
            f"The reason for this change is: {reason}.",
            voice=self.voice, language=self.language
        )
        response.pause(length=1)
        response.say(
            "To confirm this new time, please reply YES to our SMS message.",
            voice=self.voice, language=self.language
        )
        response.say(
            f"To request a different time, please call us at {reception_phone}.",
            voice=self.voice, language=self.language
        )
        response.say(
            "We sincerely apologize for any inconvenience caused. Thank you.",
            voice=self.voice, language=self.language
        )
        return str(response)

    def build_doctor_unavailable_script(self, patient_name, doctor_name,
                                         appointment_time, reception_phone):
        response = VoiceResponse()
        response.say(
            f"Hello, this is MediQ Hospital calling for {patient_name}.",
            voice=self.voice, language=self.language
        )
        response.pause(length=1)
        response.say(
            f"We regret to inform you that Doctor {doctor_name} "
            f"is unavailable for your appointment at {appointment_time}.",
            voice=self.voice, language=self.language
        )
        response.say(
            "We sincerely apologize for this inconvenience.",
            voice=self.voice, language=self.language
        )
        response.pause(length=1)
        response.say(
            "Please use the MediQ app or call us to rebook at no additional charge.",
            voice=self.voice, language=self.language
        )
        response.say(
            "Your advance payment will be fully retained for the new booking.",
            voice=self.voice, language=self.language
        )
        response.say(
            f"Our reception number is {reception_phone}. Thank you for your patience.",
            voice=self.voice, language=self.language
        )
        return str(response)

    def build_payment_reminder_script(self, patient_name, amount, appointment_time):
        response = VoiceResponse()
        response.say(
            f"Hello, this is MediQ Hospital calling for {patient_name}.",
            voice=self.voice, language=self.language
        )
        response.pause(length=1)
        response.say(
            f"This is a reminder that a payment of Rupees {amount} "
            f"is pending for your appointment at {appointment_time}.",
            voice=self.voice, language=self.language
        )
        response.say(
            "Please complete the payment in the MediQ app to confirm your slot.",
            voice=self.voice, language=self.language
        )
        response.say(
            "Unconfirmed slots may be released 30 minutes before appointment time.",
            voice=self.voice, language=self.language
        )
        response.say("Thank you. Goodbye.", voice=self.voice, language=self.language)
        return str(response)
```

### Voice Call Database Table
```sql
CREATE TABLE voice_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id),
    patient_id UUID REFERENCES users(id),
    call_sid VARCHAR(50),             -- Twilio call SID
    call_type VARCHAR(50) NOT NULL,   -- 'your_turn', 'cascade', 'reschedule', etc.
    status VARCHAR(20),               -- 'initiated','ringing','answered','no_answer','failed'
    duration_seconds INTEGER,
    answered_by VARCHAR(20),          -- 'human' or 'machine' (voicemail detection)
    attempt_number INTEGER DEFAULT 1, -- 1 or 2 (retry)
    fallback_sms_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Voice Call Retry + Fallback Logic
```python
# backend/scheduler.py (APScheduler jobs)

@scheduler.scheduled_job('interval', minutes=3, id='retry_unanswered_calls')
def retry_unanswered_calls():
    """
    Find calls from last 5 min with status='no_answer' and attempt_number=1.
    Retry once.
    If second attempt also fails → send SMS instead.
    """
    unanswered = get_unanswered_calls(minutes_ago=5, max_attempts=1)
    for call_log in unanswered:
        if call_log.call_type in HIGH_PRIORITY_CALL_TYPES:
            # Retry call
            voice_service.make_call(
                call_log.patient_phone,
                rebuild_script(call_log),
                call_log.appointment_id,
                call_log.call_type
            )
            update_call_attempt(call_log.id, attempt=2)
        else:
            # Fallback to SMS directly
            sms_service.send(call_log.patient_phone, build_fallback_sms(call_log))
            update_call_fallback_sent(call_log.id)
```

---

### NOTIFICATION PREFERENCE SCREEN — PATIENT APP

```
Screen: NotificationPreferencesScreen (inside Profile)

Sections:

1. APPOINTMENT REMINDERS
   [Toggle] Booking confirmation         (cannot disable — mandatory)
   [Toggle] 24-hour reminder             ON by default
   [Toggle] 1-hour reminder              ON by default
   [Toggle] Morning forecast for today   ON by default

2. QUEUE & WAIT TIME
   [Toggle] Geo auto check-in alert      ON by default
   [Toggle] Queue position updates       ON by default
   [Slider] Notify only if ETA changes by: [5 / 10 / 15 / 30] minutes
   [Toggle] "You are next" alert         ON (cannot disable)

3. SCHEDULE CHANGES
   [Toggle] Doctor running late          ON by default
   [Toggle] Cascade reschedule alert     ON (cannot disable)
   [Toggle] Emergency queue push notice  ON by default
   [Toggle] Doctor unavailable           ON (cannot disable)

4. PAYMENTS
   [Toggle] Payment confirmation         ON (cannot disable)
   [Toggle] Remaining payment reminder   ON by default

5. VOICE CALLS
   [Toggle] Enable voice calls           OFF by default (opt-in)
   [Hint]   "We call you for urgent schedule changes when you may miss SMS"
   [Toggle] Calls for: "You are next"    (visible only if voice enabled)
   [Toggle] Calls for: Reschedule        (visible only if voice enabled)
   [Toggle] Calls for: Doctor unavailable (visible only if voice enabled)

6. SMS SETTINGS
   [Toggle] SMS notifications            ON by default
   [Info]   "SMS is used as backup when push notifications fail"
   [Toggle] I don't have a smartphone    OFF
            (enables SMS-only mode for all notifications)

   SAVE PREFERENCES button
```

---

### NOTIFICATION HISTORY DATABASE TABLE
```sql
CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    appointment_id UUID REFERENCES appointments(id),
    event_type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL,     -- 'push','sms','voice_call','in_app'
    title VARCHAR(200),
    message TEXT,
    status VARCHAR(20),               -- 'sent','delivered','failed','read'
    twilio_sid VARCHAR(50),           -- for SMS/call tracking
    fcm_message_id VARCHAR(100),      -- for push tracking
    failure_reason TEXT,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

### COMPLETE NOTIFICATION TRIGGER MAP

| # | Event | Patient Push | Patient SMS | Patient Voice | Staff Push | Staff In-App |
|---|---|---|---|---|---|---|
| 1 | Booking confirmed | ✅ | ✅ | ❌ | ❌ | ❌ |
| 2 | Payment received | ✅ | ❌ | ❌ | ❌ | ❌ |
| 3 | 24hr reminder | ✅ | ✅ | ❌ | ❌ | ❌ |
| 4 | 1hr reminder | ✅ | ✅ | ❌ | ❌ | ❌ |
| 5 | Geo check-in | ✅ | ❌ | ❌ | ✅ reception | ✅ |
| 6 | Position = 5 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 7 | Position = 3 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 8 | Position = 1 (NEXT) | ✅ HIGH | ✅ | ✅ opt-in | ❌ | ✅ doctor |
| 9 | ETA shift >15 min | ✅ | ✅ if >30min | ❌ | ❌ | ❌ |
| 10 | Emergency pushed back | ✅ | ❌ | ❌ | ✅ all | ✅ |
| 11 | Cascade reschedule | ✅ | ✅ | ✅ | ✅ admin | ✅ |
| 12 | Rescheduled by hospital | ✅ | ✅ | ✅ | ✅ admin | ✅ |
| 13 | Doctor unavailable | ✅ | ✅ | ✅ | ✅ admin | ✅ |
| 14 | Appointment cancelled | ✅ | ✅ | ❌ | ❌ | ✅ reception |
| 15 | Payment remaining due | ✅ | ❌ | ❌ | ❌ | ✅ reception |
| 16 | Consultation complete | ✅ | ❌ | ❌ | ❌ | ❌ |
| 17 | Rating request (+2hrs) | ✅ | ❌ | ❌ | ❌ | ❌ |
| 18 | No-show detected | ❌ | ✅ warning | ❌ | ✅ | ✅ |
| 19 | Morning forecast | ✅ opt-in | ❌ | ❌ | ✅ admin | ✅ |
| 20 | Walk-in added | ❌ | ❌ | ❌ | ✅ doctor | ✅ |
| 21 | Doctor late alert | ❌ | ❌ | ❌ | ✅ admin | ✅ |
| 22 | Heartbeat lost | ❌ | ❌ | ❌ | ✅ admin | ✅ |
| 23 | Daily report ready | ❌ | ❌ | ❌ | ✅ admin | ❌ |
| 24 | QR scan anomaly | ❌ | ❌ | ❌ | ✅ admin | ✅ |
| 25 | Model retrain done | ❌ | ❌ | ❌ | ✅ admin | ❌ |

---

## ALL ENGINES — DEEP CODE SPECIFICATION

### ENGINE 1: Queue Recalculation Engine
```python
# backend/queue_engine.py

import redis
import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import Appointment, Doctor, QueueEvent
from websocket_manager import broadcast_queue_update

r = redis.from_url(os.getenv('REDIS_URL'))

class QueueEngine:

    def recalculate_queue(self, doctor_id: str, db: Session):
        """
        Full queue recalculation for one doctor.
        Called after every queue-changing event.
        O(n) where n = queue length. Fast enough for real-time.
        """
        # Step 1: Fetch all active appointments sorted initially by priority + checkin
        appointments = db.query(Appointment).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.status.in_(['checked_in', 'in_queue', 'in_consultation']),
            Appointment.scheduled_time >= datetime.now().date()
        ).order_by(
            Appointment.priority_level.asc(),      # P1 first
            Appointment.fairness_score.desc(),     # High fairness next
            Appointment.checkin_time.asc()         # Earlier checkin next
        ).all()

        if not appointments:
            r.delete(f'queue:{doctor_id}')
            broadcast_queue_update(doctor_id, [])
            return []

        # Step 2: Find current consultation
        current = next((a for a in appointments if a.status == 'in_consultation'), None)

        # Step 3: Calculate remaining time for current consultation
        if current and current.actual_start_time:
            elapsed = (datetime.now() - current.actual_start_time).total_seconds() / 60
            remaining_current = max(0, current.predicted_duration_minutes - elapsed)
        else:
            remaining_current = 0

        # Step 4: Calculate cumulative ETA for each waiting patient
        cumulative_wait = remaining_current
        queue_output = []
        position = 1

        for appt in appointments:
            if appt.status == 'in_consultation':
                appt.queue_position = 0
                appt.estimated_wait_minutes = 0
                db.add(appt)
                queue_output.append(self._serialize(appt, 0, 0))
                continue

            appt.queue_position = position
            appt.estimated_wait_minutes = round(cumulative_wait, 1)
            db.add(appt)

            queue_output.append(self._serialize(appt, position, cumulative_wait))
            cumulative_wait += appt.predicted_duration_minutes
            position += 1

        db.commit()

        # Step 5: Store in Redis (30s TTL as safety net, WebSocket is primary)
        r.setex(f'queue:{doctor_id}', 30, json.dumps(queue_output))

        # Step 6: Broadcast to all WebSocket clients watching this doctor
        broadcast_queue_update(doctor_id, queue_output)

        # Step 7: Trigger notifications for positions 5, 3, 1
        self._trigger_position_notifications(queue_output, db)

        return queue_output

    def _trigger_position_notifications(self, queue, db):
        for item in queue:
            if item['position'] in [5, 3, 1]:
                prev_position = r.get(f'last_notified_position:{item["appointment_id"]}')
                if prev_position != str(item['position']):
                    from notification_engine import NotificationEngine
                    NotificationEngine().send_position_alert(
                        item['appointment_id'],
                        item['position'],
                        item['eta_minutes'],
                        db
                    )
                    r.setex(
                        f'last_notified_position:{item["appointment_id"]}',
                        3600,
                        str(item['position'])
                    )

    def _serialize(self, appt, position, eta):
        return {
            'appointment_id': str(appt.id),
            'patient_id': str(appt.patient_id),
            'position': position,
            'eta_minutes': round(eta, 1),
            'status': appt.status,
            'priority_level': appt.priority_level,
            'fairness_score': round(appt.fairness_score, 2),
            'predicted_duration': appt.predicted_duration_minutes,
            'appointment_type': appt.appointment_type,
            'checkin_time': appt.checkin_time.isoformat() if appt.checkin_time else None
        }
```

### ENGINE 2: No-Show Detection Engine
```python
# backend/queue_engine.py (continued)

    def run_noshow_detection(self, doctor_id: str, db: Session):
        """
        Runs every 2 minutes via APScheduler.
        Detects patients who should have checked in but haven't.
        """
        now = datetime.now()
        window_start = now - timedelta(minutes=10)

        suspects = db.query(Appointment).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.status == 'booked',           # Never checked in
            Appointment.scheduled_time <= now,         # Past their slot
            Appointment.scheduled_time >= window_start, # Within 10 min window
            Appointment.geo_checkin_fired == False,
            Appointment.checkin_time == None
        ).all()

        for appt in suspects:
            appt.status = 'no_show'
            db.add(appt)

            # Log event
            db.add(QueueEvent(
                doctor_id=doctor_id,
                appointment_id=appt.id,
                event_type='no_show_detected',
                triggered_by='system',
                metadata={'scheduled_time': appt.scheduled_time.isoformat()}
            ))

            # Send warning SMS/push to patient (they might come back)
            NotificationEngine().send_noshow_warning(appt.id, db)

            db.commit()
            # Recalculate queue with gap collapsed
            self.recalculate_queue(doctor_id, db)
```

### ENGINE 3: Fairness Score Engine
```python
# backend/queue_engine.py (continued)

    def update_fairness_scores(self, doctor_id: str, db: Session):
        """
        Runs every 1 minute via APScheduler.
        Increases priority for long-waiting patients.
        Persists to PostgreSQL (not just Redis).
        """
        waiting = db.query(Appointment).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.status.in_(['checked_in', 'in_queue']),
            Appointment.checkin_time != None
        ).all()

        for appt in waiting:
            # Base increment: 1.0 per minute
            appt.fairness_score += 1.0

            # If they were pushed back by an emergency in last 5 min: bonus
            recent_pushback = db.query(QueueEvent).filter(
                QueueEvent.appointment_id == appt.id,
                QueueEvent.event_type == 'emergency_insert',
                QueueEvent.created_at >= datetime.now() - timedelta(minutes=5)
            ).first()

            if recent_pushback:
                appt.fairness_score += 2.0  # EMERGENCY_FAIRNESS_BOOST

            db.add(appt)

        db.commit()
        self.recalculate_queue(doctor_id, db)
```

### ENGINE 4: Cascade Recovery Engine
```python
# backend/queue_engine.py (continued)

    def check_and_trigger_cascade(self, doctor_id: str, db: Session):
        """
        Monitors delay in real-time.
        Triggers cascade if delay crosses specialty threshold.
        Has 45-minute lock to prevent repeated cascades.
        """
        # Check lock
        lock_key = f'cascade_lock:{doctor_id}'
        if r.exists(lock_key):
            return {'cascaded': False, 'reason': 'cascade_locked'}

        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        specialty_threshold = SPECIALTY_THRESHOLDS.get(
            doctor.specialty, 0.20  # Default 20%
        )

        # Calculate current delay
        current_appt = db.query(Appointment).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.status == 'in_consultation'
        ).first()

        if not current_appt or not current_appt.actual_start_time:
            return {'cascaded': False, 'reason': 'no_active_consultation'}

        elapsed = (datetime.now() - current_appt.actual_start_time).total_seconds() / 60
        overshoot = elapsed - current_appt.predicted_duration_minutes
        threshold_minutes = current_appt.predicted_duration_minutes * specialty_threshold

        if overshoot < threshold_minutes:
            return {'cascaded': False, 'reason': 'below_threshold'}

        # Get not-yet-arrived patients (last N in queue)
        not_arrived = db.query(Appointment).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.status == 'booked',
            Appointment.geo_checkin_fired == False,
            Appointment.scheduled_time > datetime.now()
        ).order_by(Appointment.scheduled_time.desc()).limit(3).all()

        if not not_arrived:
            return {'cascaded': False, 'reason': 'all_patients_arrived'}

        delay_minutes = round(overshoot * 1.5)  # Estimated propagated delay
        affected_ids = []

        for appt in not_arrived:
            # Calculate new recommended arrival time
            new_arrival = appt.scheduled_time + timedelta(minutes=delay_minutes)

            appt.status = 'rescheduled'
            db.add(appt)
            affected_ids.append(str(appt.id))

            # Send all channels: push + SMS + voice call
            NotificationEngine().send_cascade_notification(
                appointment_id=appt.id,
                delay_minutes=delay_minutes,
                new_arrival_time=new_arrival.strftime('%I:%M %p'),
                db=db
            )

        # Log cascade event
        db.add(QueueEvent(
            doctor_id=doctor_id,
            appointment_id=current_appt.id,
            event_type='cascade_fired',
            triggered_by='system',
            metadata={
                'affected_count': len(affected_ids),
                'delay_minutes': delay_minutes,
                'affected_appointment_ids': affected_ids
            }
        ))
        db.commit()

        # Set 45-minute lock
        r.setex(lock_key, 45 * 60, '1')

        # Notify staff
        NotificationEngine().send_staff_cascade_alert(doctor_id, len(affected_ids), db)

        return {
            'cascaded': True,
            'affected_count': len(affected_ids),
            'delay_minutes': delay_minutes,
            'lock_expires_minutes': 45
        }

SPECIALTY_THRESHOLDS = {
    'general_medicine': 0.20,
    'cardiology': 0.25,
    'dermatology': 0.15,
    'psychiatry': 0.30,      # Longer consultations, more tolerance
    'orthopedics': 0.20,
    'pediatrics': 0.20,
    'gynecology': 0.25,
    'ophthalmology': 0.15,
}
```

### ENGINE 5: Morning Forecast Engine
```python
# backend/scheduler.py

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from ml_models.noshow_model import NoShowModel
import pandas as pd

scheduler = AsyncIOScheduler()

@scheduler.scheduled_job('cron', hour=8, minute=0, id='morning_forecast')
def run_morning_forecast():
    """
    Runs at 08:00 AM every day.
    Generates per-doctor predictions.
    Saves to daily_forecasts table.
    Notifies admin via push.
    """
    db = next(get_db())
    today = datetime.now().date()
    noshow_model = NoShowModel.load()

    # Check if special day
    is_special_day = check_special_day(today)  # Public holidays, Sundays

    doctors = db.query(Doctor).filter(Doctor.is_available == True).all()

    high_risk_count = 0
    delay_predictions = []

    for doctor in doctors:
        appointments_today = db.query(Appointment).filter(
            Appointment.doctor_id == doctor.id,
            Appointment.scheduled_time >= today,
            Appointment.scheduled_time < today + timedelta(days=1),
            Appointment.status == 'confirmed'
        ).all()

        if not appointments_today:
            continue

        # Predict no-shows
        features_df = build_noshow_features(appointments_today, db)

        if is_special_day:
            # Conservative defaults on special days
            noshow_predictions = [0.3] * len(appointments_today)
            confidence = 0.5
        else:
            noshow_predictions = noshow_model.predict_proba(features_df)
            confidence = noshow_model.last_confidence_score

        high_risk_appts = [
            a for a, score in zip(appointments_today, noshow_predictions)
            if score > 0.7
        ]
        high_risk_count += len(high_risk_appts)

        # Predict delay probability from doctor's historical pattern
        delay_prob = calculate_delay_probability(doctor.id, today, db)

        # Build recommendations
        recommendations = []
        if len(high_risk_appts) > 0 and confidence >= 0.6:
            recommendations.append({
                'type': 'overbook_suggestion',
                'message': f'Consider safe overbook for {len(high_risk_appts)} high-risk slot(s)',
                'confidence': round(confidence, 2)
            })
        if delay_prob > 0.6:
            recommendations.append({
                'type': 'delay_alert',
                'message': f'Dr. {doctor.user.name} has {round(delay_prob*100)}% chance of running late',
                'confidence': round(confidence, 2)
            })
        if confidence < 0.6:
            recommendations.append({
                'type': 'low_confidence',
                'message': 'Insufficient data — soft suggestions only, no auto-changes',
                'confidence': round(confidence, 2)
            })

        # Save forecast
        db.add(DailyForecast(
            forecast_date=today,
            doctor_id=doctor.id,
            predicted_delay_minutes=delay_prob * 30,
            predicted_noshow_count=len(high_risk_appts),
            confidence_score=confidence,
            recommended_actions=recommendations,
            is_special_day=is_special_day
        ))

        # Send extra SMS reminders to high-risk patients
        if confidence >= 0.6:
            for appt in high_risk_appts:
                NotificationEngine().send_high_risk_reminder(appt.id, db)

    db.commit()

    # Notify admin
    NotificationEngine().send_morning_forecast_ready(
        high_risk_count=high_risk_count,
        db=db
    )

@scheduler.scheduled_job('cron', day_of_week='mon', hour=2, minute=0, id='weekly_retrain')
def weekly_model_retrain():
    """Retrains both ML models every Monday 2 AM."""
    from ml_models.train import retrain_all_models
    accuracy = retrain_all_models()
    NotificationEngine().send_retrain_complete(accuracy)

@scheduler.scheduled_job('interval', minutes=2, id='noshow_detection')
def run_noshow_detection_all_doctors():
    db = next(get_db())
    active_doctors = get_active_doctors(db)
    for doctor_id in active_doctors:
        QueueEngine().run_noshow_detection(doctor_id, db)

@scheduler.scheduled_job('interval', minutes=1, id='fairness_update')
def update_all_fairness_scores():
    db = next(get_db())
    active_doctors = get_active_doctors(db)
    for doctor_id in active_doctors:
        QueueEngine().update_fairness_scores(doctor_id, db)

@scheduler.scheduled_job('interval', minutes=5, id='cascade_check')
def check_cascades_all_doctors():
    db = next(get_db())
    active_doctors = get_active_doctors(db)
    for doctor_id in active_doctors:
        QueueEngine().check_and_trigger_cascade(doctor_id, db)

@scheduler.scheduled_job('interval', minutes=3, id='heartbeat_check')
def check_doctor_heartbeats():
    db = next(get_db())
    timeout = datetime.now() - timedelta(minutes=int(os.getenv('DOCTOR_HEARTBEAT_TIMEOUT_MINUTES', 20)))
    inactive = db.query(Doctor).filter(
        Doctor.is_available == True,
        Doctor.last_heartbeat < timeout
    ).all()
    for doctor in inactive:
        NotificationEngine().send_heartbeat_alert(doctor.id, db)

@scheduler.scheduled_job('cron', hour=22, minute=0, id='daily_report')
def generate_daily_report():
    db = next(get_db())
    report = generate_report(datetime.now().date(), db)
    NotificationEngine().send_daily_report_ready(report, db)

@scheduler.scheduled_job('cron', hour=8, minute=30, id='appointment_reminders_24h')
def send_24h_reminders():
    """Send reminders for tomorrow's appointments."""
    db = next(get_db())
    tomorrow = datetime.now().date() + timedelta(days=1)
    tomorrow_appts = db.query(Appointment).filter(
        Appointment.scheduled_time >= tomorrow,
        Appointment.scheduled_time < tomorrow + timedelta(days=1),
        Appointment.status == 'confirmed'
    ).all()
    for appt in tomorrow_appts:
        NotificationEngine().send_24h_reminder(appt.id, db)
```

### ENGINE 6: Per-Doctor Personality Model
```python
# backend/ml_models/doctor_personality.py

class DoctorPersonalityModel:
    """
    Learns each doctor's individual consultation speed.
    Updates after every completed consultation.
    Adjusts the duration prediction multiplier.
    """

    def update_doctor_speed_factor(self, doctor_id: str, db: Session):
        """
        Calculates rolling average of actual vs predicted duration.
        Updates doctor.speed_factor in DB.
        speed_factor > 1.0 = doctor runs slow
        speed_factor < 1.0 = doctor runs fast
        """
        # Last 50 completed consultations for this doctor
        recent = db.query(Appointment).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.status == 'completed',
            Appointment.actual_duration_minutes != None,
            Appointment.predicted_duration_minutes != None
        ).order_by(
            Appointment.actual_end_time.desc()
        ).limit(50).all()

        if len(recent) < 5:
            return  # Not enough data yet

        ratios = [
            a.actual_duration_minutes / a.predicted_duration_minutes
            for a in recent
            if a.predicted_duration_minutes > 0
        ]

        # Weighted average: recent consultations count more
        weights = list(range(1, len(ratios) + 1))
        speed_factor = sum(r * w for r, w in zip(ratios, weights)) / sum(weights)
        speed_factor = round(max(0.5, min(2.5, speed_factor)), 3)  # Clamp 0.5–2.5

        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        old_factor = doctor.speed_factor
        doctor.speed_factor = speed_factor
        db.commit()

        # Log significant changes
        if abs(speed_factor - old_factor) > 0.1:
            log_personality_change(doctor_id, old_factor, speed_factor)

    def get_adjusted_prediction(self, base_prediction: float, doctor_id: str, db: Session):
        """
        Applies doctor's personal speed factor to ML base prediction.
        Called during booking and queue recalculation.
        """
        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        adjusted = base_prediction * doctor.speed_factor
        return round(adjusted, 1)
```

### ENGINE 7: QR Verification Engine
```python
# backend/qr_engine.py

import qrcode
from cryptography.fernet import Fernet
from PIL import Image
import hmac, hashlib, base64, json, io
import cloudinary.uploader

class QREngine:

    def __init__(self):
        self.fernet = Fernet(os.getenv('QR_SECRET_KEY').encode())
        self.hmac_secret = os.getenv('QR_HMAC_SECRET').encode()

    def generate_qr(self, appointment_id: str, patient_id: str,
                    doctor_id: str, scheduled_time: datetime, db: Session):
        """
        Generates encrypted QR code, uploads to Cloudinary.
        Called automatically when appointment is confirmed + paid.
        """
        # Build payload
        payload = {
            'appointment_id': appointment_id,
            'patient_id': patient_id,
            'doctor_id': doctor_id,
            'scheduled_time': scheduled_time.isoformat(),
            'issued_at': datetime.now().isoformat(),
            'expires_at': (scheduled_time + timedelta(hours=2)).isoformat()
        }

        # Add HMAC signature
        payload_bytes = json.dumps(payload, sort_keys=True).encode()
        signature = hmac.new(self.hmac_secret, payload_bytes, hashlib.sha256).hexdigest()
        payload['hmac'] = signature

        # Encrypt with Fernet (AES-256)
        encrypted = self.fernet.encrypt(json.dumps(payload).encode())
        qr_token = base64.urlsafe_b64encode(encrypted).decode()

        # Generate QR image
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,  # 30% restoration
            box_size=10,
            border=4
        )
        qr.add_data(qr_token)
        qr.make(fit=True)
        img = qr.make_image(fill_color='black', back_color='white')

        # Upload to Cloudinary
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        upload_result = cloudinary.uploader.upload(
            img_bytes,
            public_id=f'mediq/qr/{appointment_id}',
            format='png'
        )

        # Save to DB
        qr_record = AppointmentQRCode(
            appointment_id=appointment_id,
            patient_id=patient_id,
            qr_token=qr_token,
            qr_image_url=upload_result['secure_url'],
            expires_at=scheduled_time + timedelta(hours=2)
        )
        db.add(qr_record)
        db.commit()

        return qr_record

    def verify_qr(self, qr_token: str, scanned_by: str,
                  scan_location: str, db: Session):
        """
        Full verification pipeline.
        Returns structured result for reception scanner screen.
        """
        # Step 1: Find QR record
        qr_record = db.query(AppointmentQRCode).filter(
            AppointmentQRCode.qr_token == qr_token
        ).first()

        if not qr_record:
            return {'valid': False, 'error': 'INVALID_TOKEN',
                    'message': 'QR code is invalid or has been tampered with.'}

        # Step 2: Check expiry
        if datetime.now() > qr_record.expires_at:
            return {'valid': False, 'error': 'QR_EXPIRED',
                    'message': f'QR expired at {qr_record.expires_at.strftime("%I:%M %p")}. Ask patient to regenerate.'}

        # Step 3: Check if already used AT THIS LOCATION
        if qr_record.scan_location == scan_location and qr_record.is_used:
            scanned_time = qr_record.scanned_at.strftime('%I:%M %p')
            return {'valid': False, 'error': 'ALREADY_SCANNED',
                    'message': f'Already scanned at {scan_location} at {scanned_time}.'}

        # Step 4: Decrypt and verify HMAC
        try:
            encrypted = base64.urlsafe_b64decode(qr_token.encode())
            decrypted = self.fernet.decrypt(encrypted)
            payload = json.loads(decrypted)

            # Verify HMAC
            stored_hmac = payload.pop('hmac')
            payload_bytes = json.dumps(payload, sort_keys=True).encode()
            expected_hmac = hmac.new(self.hmac_secret, payload_bytes, hashlib.sha256).hexdigest()

            if not hmac.compare_digest(stored_hmac, expected_hmac):
                return {'valid': False, 'error': 'INVALID_TOKEN',
                        'message': 'QR code has been tampered with.'}
        except Exception:
            return {'valid': False, 'error': 'INVALID_TOKEN',
                    'message': 'QR code could not be decoded.'}

        # Step 5: Get appointment details
        appt = db.query(Appointment).filter(
            Appointment.id == payload['appointment_id']
        ).first()

        if appt.status == 'cancelled':
            return {'valid': False, 'error': 'CANCELLED',
                    'message': 'This appointment was cancelled.'}

        if appt.status == 'no_show':
            return {'valid': False, 'error': 'NO_SHOW',
                    'message': 'Patient was marked as no-show. Go to reception to reinstate.'}

        # Step 6: Check payment
        payment = db.query(Payment).filter(Payment.id == appt.payment_id).first()
        if not payment or payment.status == 'pending':
            return {'valid': False, 'error': 'PAYMENT_PENDING',
                    'message': 'Advance payment not completed. Cannot check in.'}

        # Step 7: Build full response
        patient = db.query(User).filter(User.id == appt.patient_id).first()
        doctor = db.query(Doctor).join(User).filter(Doctor.id == appt.doctor_id).first()

        # Mark as scanned
        qr_record.is_used = True
        qr_record.scanned_by = scanned_by
        qr_record.scanned_at = datetime.now()
        qr_record.scan_location = scan_location
        db.commit()

        return {
            'valid': True,
            'appointment': {
                'id': str(appt.id),
                'patient_name': patient.name,
                'patient_age': patient.age,
                'patient_phone': patient.phone,
                'doctor_name': doctor.user.name,
                'specialty': doctor.specialty,
                'scheduled_time': appt.scheduled_time.strftime('%I:%M %p'),
                'appointment_type': appt.appointment_type,
                'visit_reason': appt.visit_reason,
                'queue_position': appt.queue_position,
                'estimated_wait': f'~{round(appt.estimated_wait_minutes)} minutes'
            },
            'payment': {
                'status': payment.status,
                'total_fee': payment.amount_total,
                'amount_paid': payment.amount_paid,
                'amount_remaining': payment.amount_remaining,
                'payment_method_used': payment.payment_method
            },
            'patient_flags': {
                'hypertension': patient.has_hypertension,
                'diabetes': patient.has_diabetes,
                'handicap': patient.has_handicap,
                'alcoholism': patient.has_alcoholism
            },
            'checkin_status': appt.status,
            'actions_available': self._get_actions(appt, payment)
        }

    def _get_actions(self, appt, payment):
        actions = ['view_history']
        if appt.status not in ['in_consultation', 'completed']:
            actions.append('check_in')
            actions.append('mark_noshow')
        if payment.amount_remaining > 0:
            actions.append('collect_payment')
        return actions
```

---

## FILE STRUCTURE — COMPLETE PROJECT

```
mediq/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── auth.py
│   ├── queue_engine.py
│   ├── websocket_manager.py
│   ├── notification_engine.py        ← NEW (master notification router)
│   ├── voice_call_service.py         ← NEW (Twilio TwiML voice calls)
│   ├── push_service.py               ← NEW (FCM push notifications)
│   ├── sms_service.py                ← NEW (Twilio SMS)
│   ├── qr_engine.py                  ← NEW (QR generate + verify)
│   ├── doctor_personality.py         ← NEW (per-doctor speed model)
│   ├── payment.py
│   ├── scheduler.py
│   ├── routers/
│   │   ├── auth.py
│   │   ├── patient.py
│   │   ├── booking.py
│   │   ├── queue.py
│   │   ├── doctor.py
│   │   ├── reception.py
│   │   ├── admin.py
│   │   ├── payment.py
│   │   └── forecast.py
│   ├── ml_models/
│   │   ├── train.py
│   │   ├── duration_model.py
│   │   ├── noshow_model.py
│   │   ├── duration_model.pkl
│   │   ├── noshow_model.pkl
│   │   └── KaggleV2-May-2016.csv
│   ├── alembic/
│   ├── requirements.txt
│   └── .env
├── mobile/
│   ├── App.js
│   ├── app.json
│   ├── package.json
│   ├── src/
│   │   ├── navigation/
│   │   │   ├── AppNavigator.js
│   │   │   ├── PatientNavigator.js
│   │   │   └── StaffNavigator.js
│   │   ├── screens/
│   │   │   ├── auth/
│   │   │   │   ├── SplashScreen.js
│   │   │   │   ├── OnboardingScreen.js
│   │   │   │   ├── RegisterScreen.js
│   │   │   │   ├── OTPScreen.js
│   │   │   │   ├── LoginScreen.js
│   │   │   │   └── ForgotPasswordScreen.js
│   │   │   ├── patient/
│   │   │   │   ├── HomeScreen.js
│   │   │   │   ├── BookStep1Specialty.js
│   │   │   │   ├── BookStep2Doctor.js
│   │   │   │   ├── BookStep3Slots.js
│   │   │   │   ├── BookStep4Details.js
│   │   │   │   ├── BookStep5Payment.js
│   │   │   │   ├── BookingConfirmedScreen.js
│   │   │   │   ├── MyAppointmentsScreen.js
│   │   │   │   ├── QueueTrackerScreen.js
│   │   │   │   ├── MyQRCodeScreen.js          ← NEW
│   │   │   │   ├── NotificationsScreen.js
│   │   │   │   ├── ProfileScreen.js
│   │   │   │   └── AppointmentDetailScreen.js
│   │   │   └── staff/
│   │   │       ├── StaffLoginScreen.js
│   │   │       ├── ReceptionDashboard.js
│   │   │       ├── QRScannerScreen.js         ← NEW
│   │   │       ├── QRScanResultScreen.js      ← NEW
│   │   │       ├── DoctorDashboard.js
│   │   │       ├── AdminDashboard.js
│   │   │       ├── EmergencyAdmitScreen.js
│   │   │       └── CascadeControlScreen.js
│   │   ├── components/
│   │   │   ├── QueueCard.js
│   │   │   ├── AppointmentCard.js
│   │   │   ├── DoctorCard.js
│   │   │   ├── ETATimer.js
│   │   │   ├── PaymentForm.js
│   │   │   ├── FairnessIndicator.js
│   │   │   ├── ForecastCard.js
│   │   │   ├── AlertBanner.js
│   │   │   └── LiveStatusDot.js
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   ├── websocket.js
│   │   │   ├── GeofenceService.js
│   │   │   ├── NotificationService.js
│   │   │   ├── QRService.js                   ← NEW
│   │   │   └── PaymentService.js
│   │   ├── store/
│   │   │   ├── authSlice.js
│   │   │   ├── appointmentSlice.js
│   │   │   ├── queueSlice.js
│   │   │   └── store.js
│   │   └── utils/
│   │       ├── validators.js
│   │       ├── formatters.js
│   │       └── constants.js
└── README.md
```

---

## EDGE CASES TO HANDLE

1. **Cold start**: No historical data → use SPECIALTY_DEFAULTS
2. **Doctor heartbeat**: Flag if no activity for 20+ min during working hours
3. **Concurrent geo-triggers**: Use event queue (Redis pub/sub), not direct endpoint
4. **GPS denied**: Auto-send manual check-in prompt at T-15 minutes
5. **Fairness score persistence**: Write to PostgreSQL every minute, not just Redis
6. **Cascade lock**: Redis key with 45-minute TTL after cascade fires
7. **Overbooking limit**: Max 1 overbook per doctor per 2-hour block
8. **Specialty constraint**: Load balancer must filter by specialty FIRST
9. **Preferred doctor flag**: Overrides load balancing logic
10. **Return alert**: If ETA drops below 10 min → urgent push regardless of threshold
11. **Appointment type mismatch**: Detect and correct before booking confirms
12. **Model drift**: Weekly retraining APScheduler job (every Monday 2 AM)
13. **Public holiday detection**: Manual flag in admin + holiday calendar seed data
14. **Walk-in overflow queue**: Separate from booked queue, at end of schedule
15. **Multi-specialty same visit**: Record all stops, coordinate dependent slots
16. **QR offline rendering**: QR SVG must render client-side so it works without internet at clinic
17. **QR brightness**: Auto-boost screen brightness when QR screen opens for easier scanning
18. **QR one-time rule**: Reception scan and Doctor scan are counted separately — patient can be scanned twice (once at reception, once at doctor's door) without "already used" error
19. **QR expiry**: Expires 2 hours after scheduled appointment time, not from booking time
20. **QR payment enforcement**: If payment status = 'pending' (no advance paid), QR scan shows error and blocks check-in until payment is collected

---

## DEMO DATA — SEED ON STARTUP

```python
# Seed data to generate on first run:

Doctors: 8 doctors (one per specialty)
Patients: 50 fake patients with varied demographics
Appointments: Today's schedule fully populated (30 appointments across 8 doctors)
Some appointments: already checked in
One cascade scenario: Dr. Shah running 35 min late
One emergency: P1 patient in Dr. Patel's queue
Payments: Mix of half_paid and fully_paid
Morning forecast: Already generated for today
No-show scenario: 3 patients marked as high-risk
```

---

## ENVIRONMENT VARIABLES (.env)

```env
DATABASE_URL=postgresql://user:pass@host/mediq
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRE_HOURS=24
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE=+1234567890
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
FCM_SERVER_KEY=your_fcm_key
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
KAGGLE_DATASET_PATH=./ml_models/KaggleV2-May-2016.csv
CLINIC_LAT=23.0225
CLINIC_LNG=72.5714
GEOFENCE_RADIUS_METERS=500
GEOFENCE_DWELL_SECONDS=90
QR_SECRET_KEY=your_aes_256_key_32_bytes_here
QR_EXPIRY_HOURS_AFTER_APPOINTMENT=2
QR_HMAC_SECRET=your_hmac_secret_here
TWILIO_VOICE_LANGUAGE=en-IN
TWILIO_VOICE_MODEL=Polly.Aditi
VOICE_CALL_RETRY_MINUTES=3
VOICE_CALL_RING_TIMEOUT_SECONDS=30
API_BASE_URL=https://your-backend.railway.app
RECEPTION_PHONE=+911234567890
HOSPITAL_NAME=MediQ Hospital
NO_SHOW_HIGH_RISK_THRESHOLD=0.7
CASCADE_DELAY_THRESHOLD_PERCENT=20
CASCADE_LOCK_MINUTES=45
FAIRNESS_SCORE_INCREMENT=1.0
EMERGENCY_FAIRNESS_BOOST=2.0
ETA_NOTIFICATION_THRESHOLD_MINUTES=15
DOCTOR_HEARTBEAT_TIMEOUT_MINUTES=20
```

---

## HOW TO RUN

```bash
# 1. Backend setup
cd backend
pip install -r requirements.txt
python ml_models/train.py          # Train ML models
alembic upgrade head               # Run migrations
python seed_data.py                # Seed demo data
uvicorn main:app --reload          # Start on port 8000

# 2. Mobile setup
cd mobile
npm install
npx expo start                     # Scan QR with Expo Go app

# 3. Redis
docker run -p 6379:6379 redis

# 4. Environment
cp .env.example .env               # Fill in all keys
```

---

## FINAL INSTRUCTION TO AI GENERATOR

Build this EXACTLY as specified. Do not simplify. Do not skip screens. Do not remove features. Every screen must be implemented with full validation. Every API endpoint must be implemented. The ML models must train from the Kaggle dataset. The WebSocket must broadcast real-time queue updates to all clients. The payment flow must enforce 50% upfront. The geofencing must require location consent per DPDP. The fairness scores must persist to PostgreSQL. The morning forecast must run at 08:00 via APScheduler. The cascade recovery must have a 45-minute lock. The QR engine must use AES-256 encryption + HMAC. The voice call engine must use Twilio TwiML with Indian English voice (Polly.Aditi) and retry logic. The notification engine must route correctly across Push + SMS + Voice + In-App based on user preferences and event type. The doctor personality model must update after every completed consultation. All 7 engines (Queue, No-Show Detection, Fairness, Cascade, Morning Forecast, Doctor Personality, QR) must be fully implemented with the exact code structure shown. Build it all.

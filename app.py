import os
import numpy as np
import joblib  
from flask import Flask, request, jsonify, render_template
import MySQLdb  # Direct standard robust binary client handler for global cloud sync

app = Flask(__name__)

# Model and Scaler File Paths
model_path = 'KNN_heart.pkl'
scaler_path = 'scaler.pkl'

model = None
scaler = None

# --- BRAND NEW RAILWAY.APP PUBLIC CLOUD CONNECTION ---
def get_db_connection():
    try:
        connection = MySQLdb.connect(
            host='turntable.proxy.rlwy.net',                     # Public URL Host
            port=46218,                                          # Verified Public External Port
            user='root',                                         # Database Master User
            passwd='gGwzXApZzKRqEscwjwaJnVehCalastoy',          # Verified Master Password
            db='railway'                                         # Production Database
        )
        return connection
    except Exception as e:
        print(f"❌ Railway Cloud Database Connection Error: {e}")
        return None

# Load ML Model and Scaler safely
try:
    if os.path.exists(model_path) and os.path.exists(scaler_path):
        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)
        print("🚀 ML Models and Scaler loaded successfully!")
    else:
        print("⚠️ Warning: Model or Scaler file missing. Fallback prediction mode active.")
except Exception as joblib_error:
    print(f"💥 Joblib Load Error: {joblib_error}")

@app.route('/')
def home():
    all_patients = []
    return render_template('index.html', patients=all_patients)

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        if not data:
            return jsonify({"success": False, "error": "No data received"})

        # Fetch form data inputs securely
        username = data.get('username') or 'Guest User'
        age = int(data.get('age', 40))
        sex = int(data.get('sex', 1))      
        cp = int(data.get('chest_pain', 0)) 
        trestbps = int(data.get('resting_bp', 120))
        chol = int(data.get('cholesterol', 200))
        fbs = int(data.get('fasting_bs', 0))
        restecg = int(data.get('resting_ecg', 0)) 
        thalach = int(data.get('max_hr', 150))
        exang = int(data.get('exercise_angina', 0))
        oldpeak = float(data.get('oldpeak', 0.0))
        slope = int(data.get('st_slope', 0))    
        
        # Features Pipeline array mapping
        features = [
            float(age), float(trestbps), float(chol), float(fbs), float(thalach), float(oldpeak),
            1.0 if sex == 1 else 0.0, 1.0 if cp == 1 else 0.0, 1.0 if cp == 2 else 0.0, 1.0 if cp == 3 else 0.0,
            1.0 if restecg == 1 else 0.0, 1.0 if restecg == 2 else 0.0, 1.0 if exang == 1 else 0.0,
            1.0 if slope == 1 else 0.0, 1.0 if slope == 2 else 0.0
        ]

        prediction = 0
        high_risk, low_risk = 50.0, 50.0

        if model and scaler:
            features_scaled = scaler.transform([features])
            prediction = int(model.predict(features_scaled)[0])
            probabilities = model.predict_proba(features_scaled)[0]
            high_risk = round(probabilities[1] * 100, 2)
            low_risk = round(probabilities[0] * 100, 2)
        else:
            prediction = 1 if (age > 50 or trestbps > 140 or chol > 240) else 0

        # --- REMOTE GLOBAL CLOUD SAVE BLOCK ---
        db_conn = get_db_connection()
        if db_conn:
            try:
                cursor = db_conn.cursor()
                insert_query = """
                    INSERT INTO patient_records 
                    (user_name, age, biological_sex, chest_pain_type, resting_blood_pressure, serum_cholesterol, fasting_blood_sugar, resting_ecg_results, max_heart_rate, exercise_induced_angina, st_depression, slope_of_peak_exercise, prediction_result) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                record_to_insert = (
                    username, age, sex, cp, trestbps, chol, 
                    fbs, restecg, thalach, exang, oldpeak, slope, prediction
                )
                cursor.execute(insert_query, record_to_insert)
                db_conn.commit()
                print(f"💾 Global Data Saved Successfully to Railway Cloud: {username}")
            except Exception as db_error:
                print(f"❌ Failed to insert data into Railway Cloud Database: {db_error}")
            finally:
                cursor.close()
                db_conn.close()

        return jsonify({
            "success": True,
            "prediction": prediction,
            "high_risk_prob": high_risk,
            "low_risk_prob": low_risk
        })

    except Exception as e:
        print("Backend Critical Error:", str(e))
        return jsonify({"success": False, "error": str(e)})

if __name__ == '__main__':
    app.run(debug=True, use_reloader=False)
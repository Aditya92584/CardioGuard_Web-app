import os
import numpy as np
import joblib  
from flask import Flask, request, jsonify, render_template

app = Flask(__name__)

model_path = 'KNN_heart.pkl'
scaler_path = 'scaler.pkl'

model = None
scaler = None

try:
    if os.path.exists(model_path) and os.path.exists(scaler_path):
   
        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)
        print(" ML Models and Scaler loaded successfully using Joblib!")
    else:
        print(" Warning: Model or Scaler file missing. Using fallback prediction mode.")
except Exception as joblib_error:
    print(f" Joblib Load Error handled: {joblib_error}")
    print("Server running in fallback mode.")
    model = None
    scaler = None

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

        username = data.get('username') or 'Guest User'
        
        # Raw inputs receive kar rahe hain
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
        
       
        f_age = float(age)
        f_resting_bp = float(trestbps)
        f_chol = float(chol)
        f_fasting_bs = float(fbs)
        f_max_hr = float(thalach)
        f_oldpeak = float(oldpeak)
        
    
        sex_m = 1.0 if sex == 1 else 0.0
        
     
        cp_ata = 1.0 if cp == 1 else 0.0
        cp_nap = 1.0 if cp == 2 else 0.0
        cp_ta  = 1.0 if cp == 3 else 0.0
        
      
        ecg_normal = 1.0 if restecg == 1 else 0.0
        ecg_st     = 1.0 if restecg == 2 else 0.0
        
     
        exang_y = 1.0 if exang == 1 else 0.0
        
       
        slope_flat = 1.0 if slope == 1 else 0.0
        slope_up   = 1.0 if slope == 2 else 0.0

     
        features = [
            f_age, f_resting_bp, f_chol, f_fasting_bs, f_max_hr, f_oldpeak,
            sex_m, cp_ata, cp_nap, cp_ta, ecg_normal, ecg_st, exang_y,
            slope_flat, slope_up
        ]

        prediction = 0
        high_risk = 50.0
        low_risk = 50.0

        if model and scaler:
          
            features_scaled = scaler.transform([features])
            prediction = int(model.predict(features_scaled)[0])
            probabilities = model.predict_proba(features_scaled)[0]
            
            high_risk = round(probabilities[1] * 100, 2)
            low_risk = round(probabilities[0] * 100, 2)
        else:
       
            if age > 50 or trestbps > 140 or chol > 240:
                prediction = 1
                high_risk = 75.0
                low_risk = 25.0
            else:
                prediction = 0
                high_risk = 20.0
                low_risk = 80.0

        return jsonify({
            "success": True,
            "prediction": prediction,
            "high_risk_prob": high_risk,
            "low_risk_prob": low_risk
        })

    except Exception as e:
        print("Backend Error:", str(e))
        return jsonify({"success": False, "error": str(e)})

if __name__ == '__main__':
    app.run(debug=True, use_reloader=False)

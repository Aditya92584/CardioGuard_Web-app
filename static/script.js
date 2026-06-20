document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('predictionForm');
    const resetBtn = document.getElementById('resetBtn');
    const loader = document.getElementById('loader');
    const placeholder = document.querySelector('.placeholder-result');
    const highRiskCard = document.getElementById('highRiskCard');
    const lowRiskCard = document.getElementById('lowRiskCard');
    const historyBody = document.getElementById('historyBody');
    const emptyHistoryRow = document.getElementById('emptyHistoryRow');

    function validateFormInputs() {
        const inputs = form.querySelectorAll('input[type="number"]');
        for (let input of inputs) {
            const val = parseFloat(input.value);
            const min = parseFloat(input.min);
            const max = parseFloat(input.max);

            if (isNaN(val)) {
                alert(`Please enter a valid value for ${input.labels[0]?.textContent || input.name}`);
                input.focus();
                return false;
            }

            if (val < min || val > max) {
                alert(`Value Out of Range! [${input.labels[0]?.textContent || input.name}] must be between ${min} and ${max}.`);
                input.focus();
                return false;
            }
        }
        return true;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateFormInputs()) return;

        placeholder.classList.add('hidden');
        highRiskCard.classList.add('hidden');
        lowRiskCard.classList.add('hidden');
        loader.classList.remove('hidden');

        document.getElementById('resultOutput').scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        const formData = new FormData(form);
        const payload = {
            username: formData.get('userName'),
            age: formData.get('age'),
            sex: formData.get('sex'),
            chest_pain: formData.get('cp'),
            resting_bp: formData.get('trestbps'),
            cholesterol: formData.get('chol'),
            fasting_bs: formData.get('fbs'),
            resting_ecg: formData.get('restecg'),
            max_hr: formData.get('thalach'),
            exercise_angina: formData.get('exang'),
            oldpeak: formData.get('oldpeak'),
            st_slope: formData.get('slope')
        };

        try {
            const response = await fetch('/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            loader.classList.add('hidden');

            if (data.success) {
                // Sahi percentage pick karne ke liye variable
                let finalPercentage = 0;

                if (data.prediction === 1) {
                    finalPercentage = data.high_risk_prob; // High risk percentage
                    document.getElementById('highRiskProb').innerHTML = `
                        <div class="probability-container" style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.8rem; width: 100%;">
                            <div class="prob-badge high-accent" style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 1rem; border-radius: 8px; font-size: 0.95rem; font-weight: 500; background: rgba(231, 76, 60, 0.15); color: #bd2130; border-left: 4px solid #e74c3c;">
                                <span class="prob-label">⚠️ High Risk Probability:</span>
                                <span class="prob-value" style="font-size: 1.1rem; font-weight: 700;">${data.high_risk_prob}%</span>
                            </div>
                            <div class="prob-badge low-accent" style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 1rem; border-radius: 8px; font-size: 0.95rem; font-weight: 500; background: rgba(46, 204, 113, 0.15); color: #1e7e34; border-left: 4px solid #2ecc71; opacity: 0.7;">
                                <span class="prob-label">✅ Low Risk Probability:</span>
                                <span class="prob-value" style="font-size: 1.1rem; font-weight: 700;">${data.low_risk_prob}%</span>
                            </div>
                        </div>
                    `;
                    highRiskCard.classList.remove('hidden');
                } else {
                    finalPercentage = data.low_risk_prob; // Low risk percentage
                    document.getElementById('lowRiskProb').innerHTML = `
                        <div class="probability-container" style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.8rem; width: 100%;">
                            <div class="prob-badge low-accent" style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 1rem; border-radius: 8px; font-size: 0.95rem; font-weight: 500; background: rgba(46, 204, 113, 0.15); color: #1e7e34; border-left: 4px solid #2ecc71;">
                                <span class="prob-label">✅ Low Risk Probability:</span>
                                <span class="prob-value" style="font-size: 1.1rem; font-weight: 700;">${data.low_risk_prob}%</span>
                            </div>
                            <div class="prob-badge high-accent" style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 1rem; border-radius: 8px; font-size: 0.95rem; font-weight: 500; background: rgba(231, 76, 60, 0.15); color: #bd2130; border-left: 4px solid #e74c3c; opacity: 0.7;">
                                <span class="prob-label">⚠️ High Risk Probability:</span>
                                <span class="prob-value" style="font-size: 1.1rem; font-weight: 700;">${data.high_risk_prob}%</span>
                            </div>
                        </div>
                    `;
                    lowRiskCard.classList.remove('hidden');
                }

                // History function me ab percentage bhi pass ho raha hai
                addLogToHistory(formData, data.prediction, finalPercentage);
            } else {
                alert(`Pipeline Inference Error: ${data.message || data.error}`);
                placeholder.classList.remove('hidden');
            }

        } catch (error) {
            console.error('Backend Response Error:', error);
            loader.classList.add('hidden');
            placeholder.classList.remove('hidden');
            alert('Flask Backend server se connect karne me dikkat aa rahi hai.');
        }
    });

    resetBtn.addEventListener('click', () => {
        if(confirm("Kya aap data inputs reset karna chahte hain?")) {
            form.reset();
            placeholder.classList.remove('hidden');
            highRiskCard.classList.add('hidden');
            lowRiskCard.classList.add('hidden');
            loader.classList.add('hidden');
        }
    });

    // Function me percentage accept karne ke liye param jod diya hai
    // Function me percentage accept karne ke liye param jod diya hai
    function addLogToHistory(formData, prediction, percentage) {
        if (emptyHistoryRow) {
            emptyHistoryRow.style.display = 'none';
        }

        const timestamp = new Date().toTimeString().split(' ')[0];
        const name = formData.get('userName') || 'Guest User';
        const age = formData.get('age') || '40';
        const sex = formData.get('sex') === "1" ? "Male" : "Female";
        const bp = formData.get('trestbps') || '120';
        const chol = formData.get('chol') || '200';
        const hr = formData.get('thalach') || '150';

        // Styling ko exact match karne ke liye color aur text configuration
        const badgeColor = prediction === 1 ? '#ff4d4d' : '#2ecc71';
        const badgeBg = prediction === 1 ? 'rgba(231, 76, 60, 0.15)' : 'rgba(46, 204, 113, 0.15)';
        const text = prediction === 1 ? 'Risk Detected' : 'Normal';

        const tr = document.createElement('tr');
        tr.style.animation = "slideIn 0.3s ease-out";
        
        // Yeh 6 <td> tags aapke HTML <thead> ke 6 <th> se exact vertically align honge
        tr.innerHTML = `
            <td style="padding: 1rem 0.75rem; vertical-align: middle;"><strong>${timestamp}</strong></td>
            <td style="padding: 1rem 0.75rem; vertical-align: middle;"><span style="font-weight: 600; color: #333;">${name}</span></td>
            <td style="padding: 1rem 0.75rem; vertical-align: middle;">${age} Yrs /<br><span style="color: #666; font-size: 0.85rem;">${sex}</span></td>
            <td style="padding: 1rem 0.75rem; vertical-align: middle;">${bp} /<br><span style="color: #666; font-size: 0.85rem;">${chol}</span></td>
            <td style="padding: 1rem 0.75rem; vertical-align: middle;">${hr} BPM</td>
            <td style="padding: 1rem 0.75rem; vertical-align: middle;">
                <span style="padding: 0.4rem 0.8rem; font-size: 0.85rem; font-weight: bold; border-radius: 6px; display: inline-block; background-color: ${badgeBg}; color: ${badgeColor}; text-align: center; min-width: 110px;">
                    ${text}<br><span style="font-size: 0.75rem; font-weight: 500;">(${percentage}%)</span>
                </span>
            </td>
        `;

        historyBody.insertBefore(tr, historyBody.firstChild);
    }
});
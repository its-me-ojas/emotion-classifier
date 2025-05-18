from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import os
from emotion_classifier import predict_ensemble
import tempfile

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes


# Ensure upload directory exists
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/api/')
def index():
    return render_template('index.html')

@app.route('/api/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not file.filename.endswith('.wav'):
        return jsonify({'error': 'Only WAV files are supported'}), 400

    # Save the file temporarily
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
    file.save(temp_file.name)
    
    try:
        # Get predictions
        predictions = predict_ensemble(temp_file.name)
        return jsonify(predictions)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        # Clean up the temporary file
        os.unlink(temp_file.name)

if __name__ == '__main__':
    app.run(debug=True, port=5000) 
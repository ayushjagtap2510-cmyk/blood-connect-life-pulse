from flask import Flask, render_template, request, jsonify
import os
from docx import Document
from PyPDF2 import PdfReader

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

emergency_keywords = [
    'blood shortage', 'emergency', 'critical', 'accident',
    'urgent', 'flood', 'earthquake', 'disaster', 'trauma',
    'dengue', 'hospital', 'hemorrhage', 'blood needed',
    'transfusion', 'mass casualty', 'outbreak', 'injured',
    'fatality', 'ambulance', 'operation'
]

blood_groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

def extract_text(filepath):
    ext = filepath.split('.')[-1].lower()

    if ext == 'txt':
        with open(filepath, 'r', encoding='utf-8') as file:
            return file.read()

    elif ext == 'docx':
        doc = Document(filepath)
        return '\n'.join([para.text for para in doc.paragraphs])

    elif ext == 'pdf':
        reader = PdfReader(filepath)
        text = ''
        for page in reader.pages:
            text += page.extract_text() or ''
        return text

    return ''

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/upload-news', methods=['POST'])
def upload_news():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'})

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No selected file'})

    filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(filepath)

    text = extract_text(filepath)
    lower_text = text.lower()

    matched_keywords = []
    detected_blood_groups = []

    for keyword in emergency_keywords:
        if keyword.lower() in lower_text:
            matched_keywords.append(keyword)

    for group in blood_groups:
        if group.lower() in lower_text:
            detected_blood_groups.append(group)

    emergency_detected = len(matched_keywords) >= 2

    severity = 'low'
    if len(matched_keywords) >= 6:
        severity = 'high'
    elif len(matched_keywords) >= 3:
        severity = 'medium'

    blood_stock_status = 'Sufficient'
    if emergency_detected:
        blood_stock_status = 'Stock Required'

    return jsonify({
        'emergency_detected': emergency_detected,
        'severity': severity,
        'matched_keywords': matched_keywords,
        'blood_groups_detected': detected_blood_groups,
        'blood_stock_status': blood_stock_status,
        'article_preview': text[:500],
        'message': 'Emergency detected and blood stock update required.' if emergency_detected else 'No emergency detected.'
    })

if __name__ == '__main__':
    app.run(debug=True)
from flask import Flask, render_template, request, send_file, session
import pandas as pd
import os
from io import BytesIO
import secrets

app = Flask(__name__)
# Generate a secret key for sessions
app.secret_key = secrets.token_hex(16)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size

if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return "No file part", 400
    
    file = request.files['file']
    if file.filename == '':
        return "No selected file", 400
    
    if file:
        try:
            # Read the CSV file into a DataFrame
            df = pd.read_csv(file)
            
            # Identify duplicates across all columns
            # keep=False marks all duplicates (not just the first or last occurrence)
            duplicates = df[df.duplicated(keep=False)]

            # Store the duplicates DataFrame as CSV string in session for download
            # This allows us to retrieve it later in the download route
            if not duplicates.empty:
                duplicates_csv = duplicates.to_csv(index=False)
                session['duplicates_csv'] = duplicates_csv
                session['has_duplicates'] = True
            else:
                session['has_duplicates'] = False
                session.pop('duplicates_csv', None)  # Clear any previous duplicates

            # Render the results page with the original and duplicate data
            return render_template('results.html',
                                  original_data=df.to_html(classes='table table-striped', index=False),
                                  duplicate_data=duplicates.to_html(classes='table table-striped', index=False) if not duplicates.empty else None,
                                  has_duplicates=not duplicates.empty)
        except Exception as e:
            return f"Error processing file: {e}", 500
    
    return "Something went wrong", 500


@app.route('/download_duplicates', methods=['GET'])
def download_duplicates():
    """
    Download route that retrieves the duplicates CSV from the session
    and sends it to the user as a downloadable file.
    """
    # Check if duplicates were found and stored in the session
    if not session.get('has_duplicates', False):
        return "No duplicates found in the last uploaded file.", 400
    
    duplicates_csv = session.get('duplicates_csv')
    if not duplicates_csv:
        return "Duplicate data not available. Please upload a file first.", 400
    
    # Create a BytesIO object from the CSV string
    output = BytesIO()
    output.write(duplicates_csv.encode('utf-8'))
    output.seek(0)
    
    # Send the file as a download with an appropriate filename
    return send_file(
        output,
        mimetype='text/csv',
        as_attachment=True,
        download_name='duplicates.csv'
    )


if __name__ == '__main__':
    app.run(debug=True)






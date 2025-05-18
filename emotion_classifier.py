import numpy as np
import librosa
from tensorflow import keras


# -----------------------------------
# 1) Load your three Keras models + their label‐orders
# -----------------------------------
def load_models():
    """
    Return three tuples:
      - tess_model, tess_classes
      - ravdess_model, ravdess_classes
      - crema_model, crema_classes

    Each `*_classes` array must exactly match the label-order used during training.
    """
    # 1.1) TESS (LSTM) Model
    tess_model = keras.models.load_model("tess.keras")
    tess_classes = np.array([
        'angry',
        'disgust',
        'fearful',
        'happy',
        'sad',
        'neutral',
        'surprised'
    ])

    # 1.2) RAVDESS (LSTM) Model
    ravdess_model = keras.models.load_model("ravdess.keras")
    ravdess_classes = np.array([
        "neutral",
        "calm",
        "happy",
        "sad",
        "angry",
        "fearful",
        "disgust",
        "surprised"
    ])

    # 1.3) CREMA‑D (Conv1D) Model
    crema_model = keras.models.load_model("crema_model.keras")
    crema_classes = np.array([
        'neutral',
        'happy',
        'sad',
        'angry',
        'fearful',
        'disgust'
    ])

    return (
        (tess_model, tess_classes),
        (ravdess_model, ravdess_classes),
        (crema_model, crema_classes)
    )


# -----------------------------------
# 2) Extract 37‑dim static features for the LSTM models (TESS & RAVDESS)
# -----------------------------------
def extract_static_37d(audio_path, sr=22050):
    """
    1) Load the WAV at `sr` Hz.
    2) Compute MFCC(13) → shape (13, n_frames) → append mean/std per coeff → 26 dims.
    3) Compute chroma, contrast, tonnetz, zcr, rms, pitch → total adds 11 dims.
       → Final static vector length = 37.
    Returns a 1D array of length 37.
    """
    y, _ = librosa.load(audio_path, sr=sr)

    # — MFCC: 13 coefficients × n_frames → mean/std per coefficient = 26 dims
    mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    feats = []
    for i in range(mfccs.shape[0]):
        feats.append(np.mean(mfccs[i]))
        feats.append(np.std(mfccs[i]))
    # len(feats) == 26

    # — Chroma (mean, std) → +2 dims  (total now 28)
    chroma = librosa.feature.chroma_stft(y=y, sr=sr)
    feats.append(np.mean(chroma))
    feats.append(np.std(chroma))

    # — Spectral Contrast (mean, std) → +2 dims  (total now 30)
    contrast = librosa.feature.spectral_contrast(y=y, sr=sr)
    feats.append(np.mean(contrast))
    feats.append(np.std(contrast))

    # — Tonnetz (mean, std) → +2 dims  (total now 32)
    y_harm = librosa.effects.harmonic(y)
    tonnetz = librosa.feature.tonnetz(y=y_harm, sr=sr)
    feats.append(np.mean(tonnetz))
    feats.append(np.std(tonnetz))

    # — Zero Crossing Rate (mean) → +1 dim  (total now 33)
    zcr = librosa.feature.zero_crossing_rate(y)
    feats.append(np.mean(zcr))

    # — RMS Energy (mean, std) → +2 dims  (total now 35)
    rms = librosa.feature.rms(y=y)
    feats.append(np.mean(rms))
    feats.append(np.std(rms))

    # — Pitch (mean, std over frames where magnitude > median) → +2 dims  (total now 37)
    pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
    pitch_vals = pitches[magnitudes > np.median(magnitudes)]
    if len(pitch_vals) > 0:
        feats.append(np.mean(pitch_vals))
        feats.append(np.std(pitch_vals))
    else:
        feats.append(0.0)
        feats.append(0.0)

    return np.array(feats, dtype=np.float32)  # shape = (37,)


# -----------------------------------
# 3) Extract a 1‑D "sequence" for the CREMA‑D Conv1D model
# -----------------------------------
def extract_seq_for_crema(audio_path, target_length, sr=22050):
    """
    1) Load the WAV at `sr` Hz.
    2) Compute MFCC with n_mfcc=1 → shape (1, n_frames).
    3) Transpose to (n_frames, 1).
    4) Pad with zeros (if n_frames < target_length) or truncate (if n_frames > target_length) 
       so that you end up with exactly (target_length, 1).
    Returns a numpy array of shape (target_length, 1).
    """
    y, _ = librosa.load(audio_path, sr=sr)
    mfcc1 = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=1)  # shape = (1, n_frames)
    seq = mfcc1.T                                      # shape = (n_frames, 1)

    n_frames = seq.shape[0]
    if n_frames < target_length:
        pad_amt = target_length - n_frames
        seq = np.vstack([seq, np.zeros((pad_amt, 1), dtype=np.float32)])
    else:
        seq = seq[:target_length, :]

    return seq.astype(np.float32)  # shape = (target_length, 1)


# -----------------------------------
# 4) Run inference on each model with its correct reshape + ensemble
# -----------------------------------
def predict_ensemble(audio_path):
    """
    1. Loads the three models.
    2. Extracts:
       - A (37,) static vector → reshaped to (1, 1, 37) for TESS & RAVDESS.
       - A (target_length, 1) sequence → reshaped to (1, target_length, 1) for CREMA‑D.
    3. Calls each model.predict(...) and obtains its softmax vector.
    4. Maps each vector into a unified 8‐class ordering: 
       ['neutral','calm','happy','sad','angry','fearful','disgust','surprised'].
    5. Averages the three 8‐dim vectors element‐wise.
    6. Picks argmax of the averaged vector as final emotion.
    7. Returns the predictions as a dictionary.
    """
    # Load models + class lists
    (tess_model, tess_classes), \
    (ravdess_model, ravdess_classes), \
    (crema_model, crema_classes) = load_models()

    # Define unified label order for ensemble
    unified_labels = np.array([
        'neutral',
        'calm',
        'happy',
        'sad',
        'angry',
        'fearful',
        'disgust',
        'surprised'
    ])
    num_unified = len(unified_labels)  # 8

    # 1) STATIC 37‑dim features for the two LSTM models
    feat37 = extract_static_37d(audio_path)  # shape = (37,)

    # Reshape → (batch=1, timesteps=1, features=37)
    x_tess = feat37.reshape(1, 1, feat37.shape[0])  # → (1, 1, 37)
    x_rav  = feat37.reshape(1, 1, feat37.shape[0])  # → (1, 1, 37)

    # 2) SEQUENCE for CREMA‑D
    _, time_steps, channels = crema_model.input_shape
    if channels != 1:
        raise ValueError(f"CREMA‑D was trained with channels={channels}, but this code assumes channels=1.")
    seq_for_crema = extract_seq_for_crema(audio_path, target_length=time_steps)  # → (time_steps, 1)
    x_cre = seq_for_crema.reshape(1, time_steps, 1)  # → (1, time_steps, 1)

    # 3) PREDICT each model → get raw softmax vectors
    probs_list = []  # to store each model's 8‐dim mapped vector
    top_results = []  # to store each model's top‐1 and confidence

    # — TESS (LSTM)
    raw_tess = tess_model.predict(x_tess, verbose=0)[0]  # shape = (7,)
    # Map to 8 dims: find index in unified_labels for each tess_class, fill
    map_tess = np.zeros(num_unified, dtype=np.float32)
    for i, lbl in enumerate(tess_classes):
        idx = np.where(unified_labels == lbl)[0][0]
        map_tess[idx] = raw_tess[i]
    probs_list.append(map_tess)

    top_idx = np.argmax(raw_tess)
    top_label = tess_classes[top_idx]
    top_conf = float(raw_tess[top_idx])
    top_results.append(("TESS", top_label, top_conf))

    # — RAVDESS (LSTM)
    raw_rav = ravdess_model.predict(x_rav, verbose=0)[0]  # shape = (8,)
    map_rav = np.zeros(num_unified, dtype=np.float32)
    for i, lbl in enumerate(ravdess_classes):
        idx = np.where(unified_labels == lbl)[0][0]
        map_rav[idx] = raw_rav[i]
    probs_list.append(map_rav)

    top_idx = np.argmax(raw_rav)
    top_label = ravdess_classes[top_idx]
    top_conf = float(raw_rav[top_idx])
    top_results.append(("RAVDESS", top_label, top_conf))

    # — CREMA‑D (Conv1D)
    raw_cre = crema_model.predict(x_cre, verbose=0)[0]  # shape = (6,)
    map_cre = np.zeros(num_unified, dtype=np.float32)
    for i, lbl in enumerate(crema_classes):
        idx = np.where(unified_labels == lbl)[0][0]
        map_cre[idx] = raw_cre[i]
    probs_list.append(map_cre)

    top_idx = np.argmax(raw_cre)
    top_label = crema_classes[top_idx]
    top_conf = float(raw_cre[top_idx])
    top_results.append(("CREMA-D", top_label, top_conf))

    # 4) Ensemble: average the three mapped vectors
    stacked = np.vstack(probs_list)        # shape = (3, 8)
    avg_probs = np.mean(stacked, axis=0)   # shape = (8,)

    final_idx = np.argmax(avg_probs)
    final_label = unified_labels[final_idx]
    final_conf = float(avg_probs[final_idx])

    # Create response dictionary
    response = {
        'individual_predictions': [
            {
                'model': model_name,
                'emotion': label,
                'confidence': conf
            }
            for model_name, label, conf in top_results
        ],
        'ensemble_prediction': {
            'emotion': final_label,
            'confidence': final_conf
        },
        'all_probabilities': {
            label: float(prob)
            for label, prob in zip(unified_labels, avg_probs)
        }
    }

    return response

# Remove the main block since we'll be using this as a module
# if __name__ == "__main__":
#     test_audio = "path/to/your/audio.wav"
#     predict_ensemble(test_audio) 
import torch
import joblib
import numpy as np
import cv2
from transformers import DistilBertTokenizer, DistilBertModel
from torchvision import transforms, models
from pdf2image import convert_from_path
from PIL import Image
import torch.nn as nn
from pdfminer.high_level import extract_text
import tempfile
import pytesseract

class HybridModel(nn.Module):
    def __init__(self, num_classes):
        super(HybridModel, self).__init__()
        self.text_model = DistilBertModel.from_pretrained("distilbert-base-uncased")
        self.vision_model = models.resnet18(pretrained=False)
        self.vision_model.fc = nn.Linear(self.vision_model.fc.in_features, 256)
        self.fc_fusion = nn.Sequential(
            nn.Linear(256 + 768, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, num_classes)
        )

    def forward(self, input_ids, attention_mask, image):
        text_out = self.text_model(input_ids=input_ids, attention_mask=attention_mask)
        text_feat = text_out.last_hidden_state[:, 0, :]
        img_feat = self.vision_model(image)
        fused = torch.cat((text_feat, img_feat), dim=1)
        return self.fc_fusion(fused)

class DocumentClassifier:
    def __init__(self, model_path, label_map_path):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"🔧 Using device: {self.device}")
        
        # Load label map
        self.label_map = joblib.load(label_map_path)
        self.idx_to_label = {v: k for k, v in self.label_map.items()}
        print(f"📋 Loaded {len(self.label_map)} categories: {list(self.label_map.keys())}")
        
        # Load model
        self.model = HybridModel(num_classes=len(self.label_map))
        self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        self.model.to(self.device)
        self.model.eval()
        print(f"🤖 Model loaded successfully")
        
        # Initialize tokenizer and transforms
        self.tokenizer = DistilBertTokenizer.from_pretrained("distilbert-base-uncased")
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor()
        ])
    
    def extract_text_from_pdf(self, pdf_path):
        """Extract text from PDF using pdfminer, fallback to OCR if needed"""
        try:
            # Try direct text extraction first
            text = extract_text(pdf_path).strip()
            if len(text) > 50:
                print(f"📝 Extracted {len(text)} characters using pdfminer")
                return text
            
            # OCR fallback for scanned PDFs
            print("🔍 Text extraction insufficient, using OCR...")
            with tempfile.TemporaryDirectory() as temp_dir:
                images = convert_from_path(pdf_path, dpi=150, fmt='png', output_folder=temp_dir)
                text_ocr = ""
                
                # Only process first page for speed
                for img in images[:1]:
                    img_cv = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2GRAY)
                    _, thresh = cv2.threshold(img_cv, 150, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                    text_ocr += pytesseract.image_to_string(thresh) + " "
                
                print(f"📝 Extracted {len(text_ocr)} characters using OCR")
                return text_ocr.strip()
                
        except Exception as e:
            print(f"⚠️ Failed to extract text from {pdf_path}: {e}")
            return ""
    
    def pdf_to_image(self, pdf_path):
        """Convert first page of PDF to image"""
        try:
            images = convert_from_path(pdf_path, dpi=150)
            print(f"🖼️ Converted PDF to image successfully")
            return images[0].convert("RGB")
        except Exception as e:
            print(f"⚠️ Failed to convert PDF to image: {e}")
            # Return blank image as fallback
            return Image.new("RGB", (224, 224), color="white")
    
    def classify(self, pdf_path):
        """Classify a PDF document"""
        print(f"\n{'='*60}")
        print(f"📄 Starting classification for: {pdf_path}")
        print(f"{'='*60}")
        
        # Extract text and image
        text = self.extract_text_from_pdf(pdf_path)
        img = self.pdf_to_image(pdf_path)
        
        # Prepare inputs
        encoding = self.tokenizer(
            text,
            padding="max_length",
            truncation=True,
            max_length=256,
            return_tensors="pt"
        )
        img_tensor = self.transform(img).unsqueeze(0)
        
        # Perform inference
        with torch.no_grad():
            logits = self.model(
                encoding["input_ids"].to(self.device),
                encoding["attention_mask"].to(self.device),
                img_tensor.to(self.device)
            )
            probs = torch.softmax(logits, dim=1).cpu().numpy()[0]
            pred_idx = np.argmax(probs)
            pred_label = self.idx_to_label[pred_idx]
            confidence = float(probs[pred_idx] * 100)
        
        # Prepare probabilities dictionary
        probabilities = {
            self.idx_to_label[idx]: float(probs[idx] * 100)
            for idx in range(len(probs))
        }
        
        print(f"\n🎯 Results:")
        print(f"   Predicted Class: {pred_label}")
        print(f"   Confidence: {confidence:.2f}%")
        print(f"\n📊 All Probabilities:")
        for label, prob in sorted(probabilities.items(), key=lambda x: x[1], reverse=True):
            print(f"   {label:20s}: {prob:6.2f}%")
        print(f"{'='*60}\n")
        
        return {
            'predicted_class': pred_label,
            'confidence': confidence,
            'probabilities': probabilities
        }

from pathlib import Path
import io

import joblib
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


# Create FastAPI application
app = FastAPI(
    title="Employee Attrition Prediction API",
    version="1.0.0",
)

# Allow React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the trained ML model using a project-relative path
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "employee_attrition_model.pkl"

if not MODEL_PATH.is_file():
    raise FileNotFoundError(
        f"Model file not found: {MODEL_PATH}"
    )

model = joblib.load(MODEL_PATH)


# Employee input structure
class EmployeeData(BaseModel):
    Age: int
    BusinessTravel: str
    DailyRate: int
    Department: str
    DistanceFromHome: int
    Education: int
    EducationField: str
    EnvironmentSatisfaction: int
    Gender: str
    HourlyRate: int
    JobInvolvement: int
    JobLevel: int
    JobRole: str
    JobSatisfaction: int
    MaritalStatus: str
    MonthlyIncome: int
    MonthlyRate: int
    NumCompaniesWorked: int
    OverTime: str
    PercentSalaryHike: int
    PerformanceRating: int
    RelationshipSatisfaction: int
    StockOptionLevel: int
    TotalWorkingYears: int
    TrainingTimesLastYear: int
    WorkLifeBalance: int
    YearsAtCompany: int
    YearsInCurrentRole: int
    YearsSinceLastPromotion: int
    YearsWithCurrManager: int


# Required features for the ML model
REQUIRED_COLUMNS = list(EmployeeData.model_fields.keys())

NUMERIC_COLUMNS = [
    "Age",
    "DailyRate",
    "DistanceFromHome",
    "Education",
    "EnvironmentSatisfaction",
    "HourlyRate",
    "JobInvolvement",
    "JobLevel",
    "JobSatisfaction",
    "MonthlyIncome",
    "MonthlyRate",
    "NumCompaniesWorked",
    "PercentSalaryHike",
    "PerformanceRating",
    "RelationshipSatisfaction",
    "StockOptionLevel",
    "TotalWorkingYears",
    "TrainingTimesLastYear",
    "WorkLifeBalance",
    "YearsAtCompany",
    "YearsInCurrentRole",
    "YearsSinceLastPromotion",
    "YearsWithCurrManager",
]

THRESHOLD = 0.40
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB


# Home route
@app.get("/")
def home():
    return {
        "message": "Employee Attrition Prediction API is running!"
    }


# Predict attrition for one employee
@app.post("/predict")
def predict(data: EmployeeData):
    employee_df = pd.DataFrame([data.model_dump()])

    probability = float(model.predict_proba(employee_df)[0][1])

    if probability >= THRESHOLD:
        prediction = "Yes"
        risk = "High Risk"
    else:
        prediction = "No"
        risk = "Lower Risk"

    return {
        "prediction": prediction,
        "probability": round(probability * 100, 2),
        "risk": risk,
    }


# Predict attrition for multiple employees using a CSV file
@app.post("/predict-csv")
async def predict_csv(file: UploadFile = File(...)):
    try:
        # Check file type
        if not file.filename or not file.filename.lower().endswith(".csv"):
            raise HTTPException(
                status_code=400,
                detail="Please upload a CSV file.",
            )

        # Read uploaded CSV file
        contents = await file.read()

        if len(contents) > MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=400,
                detail="File is too large. Maximum size is 10 MB.",
            )

        # Read CSV data
        try:
            df = pd.read_csv(io.BytesIO(contents))
        except (ValueError, pd.errors.ParserError, UnicodeDecodeError):
            raise HTTPException(
                status_code=400,
                detail="Could not read the CSV file. Check its format.",
            )

        if df.empty:
            raise HTTPException(
                status_code=400,
                detail="The CSV file contains no employee records.",
            )

        # Check required columns
        missing_columns = [
            column for column in REQUIRED_COLUMNS
            if column not in df.columns
        ]

        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Required columns are missing.",
                    "missing_columns": missing_columns,
                },
            )

        # Select features in the correct order
        employee_data = df[REQUIRED_COLUMNS].copy()

        # Check missing values
        if employee_data.isnull().any().any():
            raise HTTPException(
                status_code=400,
                detail="The CSV contains empty values. Fill them before uploading.",
            )

        # Validate numeric columns
        for column in NUMERIC_COLUMNS:
            try:
                employee_data[column] = pd.to_numeric(
                    employee_data[column],
                    errors="raise",
                )
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=400,
                    detail=f"Column '{column}' must contain valid numeric values.",
                )

        # Get attrition probabilities
        probabilities = model.predict_proba(employee_data)[:, 1]

        # Add prediction results to the original CSV
        results = df.copy()

        results["Prediction"] = [
            "Yes" if probability >= THRESHOLD else "No"
            for probability in probabilities
        ]

        results["Probability"] = [
            round(float(probability) * 100, 2)
            for probability in probabilities
        ]

        results["Risk"] = [
            "High Risk" if probability >= THRESHOLD else "Lower Risk"
            for probability in probabilities
        ]

        return {
            "total_employees": int(len(results)),
            "high_risk_count": int(
                (results["Risk"] == "High Risk").sum()
            ),
            "lower_risk_count": int(
                (results["Risk"] == "Lower Risk").sum()
            ),
            "results": results.to_dict(orient="records"),
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while processing the CSV.",
        )

    finally:
        await file.close()

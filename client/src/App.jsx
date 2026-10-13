
import { useState } from 'react'
import './App.css'

const fields = [
  { name: 'Age', label: 'Age', type: 'number' },
  { name: 'BusinessTravel', label: 'Business Travel', options: [['Travel_Rarely', 'Travel Rarely'], ['Travel_Frequently', 'Travel Frequently'], ['Non-Travel', 'Non-Travel']] },
  { name: 'DailyRate', label: 'Daily Rate', type: 'number' },
  { name: 'Department', label: 'Department', options: [['Sales', 'Sales'], ['Research & Development', 'Research & Development'], ['Human Resources', 'Human Resources']] },
  { name: 'DistanceFromHome', label: 'Distance From Home', type: 'number' },
  { name: 'Education', label: 'Education', options: [['1', 'Below College'], ['2', 'College'], ['3', 'Bachelor'], ['4', 'Master'], ['5', 'Doctor']] },
  { name: 'EducationField', label: 'Education Field', options: [['Life Sciences', 'Life Sciences'], ['Medical', 'Medical'], ['Marketing', 'Marketing'], ['Technical Degree', 'Technical Degree'], ['Human Resources', 'Human Resources'], ['Other', 'Other']] },
  { name: 'EnvironmentSatisfaction', label: 'Environment Satisfaction', options: [['1', 'Low'], ['2', 'Medium'], ['3', 'High'], ['4', 'Very High']] },
  { name: 'Gender', label: 'Gender', options: [['Male', 'Male'], ['Female', 'Female']] },
  { name: 'HourlyRate', label: 'Hourly Rate', type: 'number' },
  { name: 'JobInvolvement', label: 'Job Involvement', options: [['1', 'Low'], ['2', 'Medium'], ['3', 'High'], ['4', 'Very High']] },
  { name: 'JobLevel', label: 'Job Level', options: [['1', 'Level 1'], ['2', 'Level 2'], ['3', 'Level 3'], ['4', 'Level 4'], ['5', 'Level 5']] },
  { name: 'JobRole', label: 'Job Role', options: [['Healthcare Representative', 'Healthcare Representative'], ['Human Resources', 'Human Resources'], ['Laboratory Technician', 'Laboratory Technician'], ['Manager', 'Manager'], ['Manufacturing Director', 'Manufacturing Director'], ['Research Director', 'Research Director'], ['Research Scientist', 'Research Scientist'], ['Sales Executive', 'Sales Executive'], ['Sales Representative', 'Sales Representative']] },
  { name: 'JobSatisfaction', label: 'Job Satisfaction', options: [['1', 'Low'], ['2', 'Medium'], ['3', 'High'], ['4', 'Very High']] },
  { name: 'MaritalStatus', label: 'Marital Status', options: [['Single', 'Single'], ['Married', 'Married'], ['Divorced', 'Divorced']] },
  { name: 'MonthlyIncome', label: 'Monthly Income', type: 'number' },
  { name: 'MonthlyRate', label: 'Monthly Rate', type: 'number' },
  { name: 'NumCompaniesWorked', label: 'Number of Companies Worked', type: 'number' },
  { name: 'OverTime', label: 'OverTime', options: [['Yes', 'Yes'], ['No', 'No']] },
  { name: 'PercentSalaryHike', label: 'Percent Salary Hike', type: 'number' },
  { name: 'PerformanceRating', label: 'Performance Rating', options: [['3', 'Excellent (3)'], ['4', 'Outstanding (4)']] },
  { name: 'RelationshipSatisfaction', label: 'Relationship Satisfaction', options: [['1', 'Low'], ['2', 'Medium'], ['3', 'High'], ['4', 'Very High']] },
  { name: 'StockOptionLevel', label: 'Stock Option Level', options: [['0', 'Level 0'], ['1', 'Level 1'], ['2', 'Level 2'], ['3', 'Level 3']] },
  { name: 'TotalWorkingYears', label: 'Total Working Years', type: 'number' },
  { name: 'TrainingTimesLastYear', label: 'Training Times Last Year', type: 'number' },
  { name: 'WorkLifeBalance', label: 'Work Life Balance', options: [['1', 'Bad'], ['2', 'Good'], ['3', 'Better'], ['4', 'Best']] },
  { name: 'YearsAtCompany', label: 'Years At Company', type: 'number' },
  { name: 'YearsInCurrentRole', label: 'Years In Current Role', type: 'number' },
  { name: 'YearsSinceLastPromotion', label: 'Years Since Last Promotion', type: 'number' },
  { name: 'YearsWithCurrManager', label: 'Years With Current Manager', type: 'number' },
]

const numericFields = new Set(
  fields.filter((field) => field.type === 'number').map((field) => field.name)
)

function App() {
  const [employee, setEmployee] = useState(
    Object.fromEntries(fields.map((field) => [field.name, '']))
  )
  const [prediction, setPrediction] = useState('')
  const [probability, setProbability] = useState('')
  const [risk, setRisk] = useState('')
  const [error, setError] = useState('')
  const [singleLoading, setSingleLoading] = useState(false)

  const [csvFile, setCsvFile] = useState(null)
  const [bulkResults, setBulkResults] = useState(null)
  const [bulkError, setBulkError] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)

  const handleFieldChange = (name, value) => {
    setEmployee((previous) => ({ ...previous, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setPrediction('')
    setProbability('')
    setRisk('')
    setSingleLoading(true)

    const employeeData = Object.fromEntries(
      Object.entries(employee).map(([key, value]) => [
        key,
        numericFields.has(key) ? Number(value) : value,
      ])
    )

    try {
      const response = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeData),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          typeof result.detail === 'string'
            ? result.detail
            : 'Prediction failed. Check your input values.'
        )
      }

      setPrediction(result.prediction)
      setProbability(result.probability)
      setRisk(result.risk)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Unable to connect to FastAPI.')
    } finally {
      setSingleLoading(false)
    }
  }

  const handleBulkSubmit = async (e) => {
    e.preventDefault()

    if (!csvFile) {
      setBulkError('Please select a CSV file first.')
      return
    }

    setBulkError('')
    setBulkResults(null)
    setBulkLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', csvFile)

      const response = await fetch('http://127.0.0.1:8000/predict-csv', {
        method: 'POST',
        body: formData,
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          typeof result.detail === 'string'
            ? result.detail
            : JSON.stringify(result.detail)
        )
      }

      setBulkResults(result)
    } catch (err) {
      console.error(err)
      setBulkError(err.message || 'Unable to connect to FastAPI.')
    } finally {
      setBulkLoading(false)
    }
  }

  const downloadResults = () => {
    if (!bulkResults?.results?.length) return

    const columns = Object.keys(bulkResults.results[0])
    const csvRows = [
      columns,
      ...bulkResults.results.map((row) =>
        columns.map((column) => row[column] ?? '')
      ),
    ]

    const csvContent = csvRows
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')
      )
      .join('\r\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'employee_attrition_predictions.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <a className="brand" href="#overview">
          <span className="brand-icon">EA</span>
          <span>
            <strong>AttritionAI</strong>
            <small>HR Intelligence</small>
          </span>
        </a>

        <p className="sidebar-label">WORKSPACE</p>

        <nav className="sidebar-nav">
          <a className="nav-link active" href="#overview"><span className="nav-icon">▦</span>Dashboard</a>
          <a className="nav-link" href="#bulk-prediction"><span className="nav-icon">⇧</span>Bulk Prediction</a>
          <a className="nav-link" href="#single-prediction"><span className="nav-icon">♙</span>Single Prediction</a>
        </nav>

        <div className="sidebar-footer">
          <div className="status-dot" />
          <div>
            <strong>ML Model</strong>
            <small>Prediction workspace</small>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="breadcrumb">Workspace / Dashboard</p>
            <h1>Employee Attrition</h1>
          </div>
          <span className="topbar-badge">ML Powered</span>
        </header>

        <section id="overview" className="dashboard-section">
          <div className="welcome-banner">
            <div>
              <p className="eyebrow">EMPLOYEE ANALYTICS</p>
              <h2>Understand employee attrition</h2>
              <p>Predict employee attrition risk using your machine learning model.</p>
            </div>
            <div className="banner-symbol">✦</div>
          </div>

          <div className="section-heading overview-heading">
            <div>
              <h2>Prediction Overview</h2>
              <p>Summary of your latest bulk prediction run.</p>
            </div>
          </div>

          <div className="overview-grid">
            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-icon blue">▦</span>
                <span className="stat-label">TOTAL EMPLOYEES</span>
              </div>
              <strong className="stat-value">
                {bulkResults ? bulkResults.total_employees.toLocaleString() : '—'}
              </strong>
              <p>{bulkResults ? 'Employees processed' : 'Upload a CSV to get started'}</p>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-icon red">↗</span>
                <span className="stat-label">HIGH RISK</span>
              </div>
              <strong className="stat-value">
                {bulkResults ? bulkResults.high_risk_count.toLocaleString() : '—'}
              </strong>
              <p>Predicted as high risk</p>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-icon green">✓</span>
                <span className="stat-label">LOWER RISK</span>
              </div>
              <strong className="stat-value">
                {bulkResults ? bulkResults.lower_risk_count.toLocaleString() : '—'}
              </strong>
              <p>Predicted as lower risk</p>
            </article>
          </div>
        </section>

        <section id="bulk-prediction" className="content-card dashboard-section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">BULK ANALYSIS</span>
              <h2>Bulk Employee Prediction</h2>
              <p>Upload an employee CSV file to predict multiple records.</p>
            </div>
          </div>

          <form className="upload-form" onSubmit={handleBulkSubmit}>
            <div className="upload-area">
              <span className="upload-icon">↑</span>
              <div className="upload-copy">
                <label htmlFor="employee-csv">Choose your employee CSV file</label>
                <p>CSV file containing the required employee features.</p>
              </div>
              <input
                id="employee-csv"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  setCsvFile(e.target.files?.[0] || null)
                  setBulkError('')
                  setBulkResults(null)
                }}
              />
            </div>

            {csvFile && <p className="selected-file">Selected file: <strong>{csvFile.name}</strong></p>}

            <button className="primary-button" type="submit" disabled={bulkLoading}>
              {bulkLoading ? 'Predicting...' : 'Predict All Employees'}
            </button>
          </form>

          {bulkError && <p className="error-message" role="alert">{bulkError}</p>}

          {bulkResults && (
            <div className="results-area">
              <div className="results-heading">
                <div>
                  <h3>Bulk Prediction Results</h3>
                  <p>{bulkResults.total_employees} employee records processed</p>
                </div>
                <button type="button" className="secondary-button" onClick={downloadResults}>
                  ↓ Download CSV
                </button>
              </div>

              <div className="table-wrapper">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Employee Number</th>
                      <th>Prediction</th>
                      <th>Probability</th>
                      <th>Risk Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkResults.results.map((row, index) => (
                      <tr key={row.EmployeeNumber ?? index}>
                        <td>{row.EmployeeNumber ?? index + 1}</td>
                        <td>
                          <span className={`prediction-badge ${row.Prediction === 'Yes' ? 'badge-danger' : 'badge-success'}`}>
                            {row.Prediction}
                          </span>
                        </td>
                        <td>{row.Probability}%</td>
                        <td>
                          <span className={`risk-badge ${String(row.Risk).toLowerCase().includes('high') ? 'risk-high' : 'risk-low'}`}>
                            {row.Risk}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="disclaimer">Predictions are estimates from the model, not guarantees of employee behavior.</p>
            </div>
          )}
        </section>

        <section id="single-prediction" className="content-card dashboard-section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">INDIVIDUAL ANALYSIS</span>
              <h2>Single Employee Prediction</h2>
              <p>Enter employee details to generate an individual prediction.</p>
            </div>
          </div>

          <form className="employee-form" onSubmit={handleSubmit}>
            {fields.map((field) => (
              <div className="field-group" key={field.name}>
                <label htmlFor={field.name}>{field.label}</label>

                {field.options ? (
                  <select
                    id={field.name}
                    value={employee[field.name]}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    required
                  >
                    <option value="">Select an option</option>
                    {field.options.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={field.name}
                    type="number"
                    min="0"
                    value={employee[field.name]}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    required
                  />
                )}
              </div>
            ))}

            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={singleLoading}>
                {singleLoading ? 'Predicting...' : 'Predict Attrition'}
              </button>
            </div>
          </form>

          {error && <p className="error-message" role="alert">{error}</p>}

          {prediction !== '' && (
            <div className="single-result">
              <div className="results-heading">
                <div>
                  <span className="section-kicker">PREDICTION COMPLETE</span>
                  <h3>Prediction Result</h3>
                </div>
                <span className={`prediction-badge ${prediction === 'Yes' ? 'badge-danger' : 'badge-success'}`}>
                  {prediction === 'Yes' ? 'May Leave' : 'Likely to Stay'}
                </span>
              </div>

              <div className="result-metrics">
                <div className="result-metric">
                  <span>Attrition</span>
                  <strong>{prediction}</strong>
                </div>
                <div className="result-metric">
                  <span>Probability</span>
                  <strong>{probability}%</strong>
                </div>
                <div className="result-metric">
                  <span>Risk Level</span>
                  <strong>{risk}</strong>
                </div>
              </div>

              <p className="disclaimer">This prediction is an estimate and should support, not replace, careful and fair HR decision-making.</p>
            </div>
          )}
        </section>

        <footer className="app-footer">
          Employee Attrition Prediction · Machine Learning Project
        </footer>
      </main>
    </div>
  )
}

export default App

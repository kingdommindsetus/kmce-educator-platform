"use client";
import { useState } from "react";

interface CourseFormData {
  faculty: string;
  title: string;
  format: string;
  audience: string;
  educationalNeed: string;
}

interface Props {
  educatorName: string;
  onSubmit?: (data: CourseFormData) => Promise<void>;
  onCancel?: () => void;
}

export default function CourseCreationForm({ educatorName, onSubmit, onCancel }: Props) {
  const [formData, setFormData] = useState<CourseFormData>({
    faculty: "",
    title: "",
    format: "",
    audience: "",
    educationalNeed: ""
  });

  const [errors, setErrors] = useState<Partial<CourseFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const requiredFields: (keyof CourseFormData)[] = ["faculty", "title", "format", "audience", "educationalNeed"];

  const validateForm = () => {
    const newErrors: Partial<CourseFormData> = {};
    requiredFields.forEach(field => {
      if (!formData[field]?.trim()) {
        newErrors[field] = "" as any;
      }
    });
    return newErrors;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof CourseFormData]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof CourseFormData];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSubmitMessage("");
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage("");

    try {
      if (onSubmit) {
        await onSubmit(formData);
        setSubmitMessage("✓ Course created successfully");
        setFormData({ faculty: "", title: "", format: "", audience: "", educationalNeed: "" });
      }
    } catch (error) {
      setSubmitMessage(`Error: ${error instanceof Error ? error.message : "Failed to create course"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (
    label: string,
    name: keyof CourseFormData,
    type: "text" | "textarea" | "select" = "text",
    options?: string[],
    placeholder?: string
  ) => {
    const isRequired = requiredFields.includes(name);
    const hasError = errors[name];

    return (
      <div className="form-group">
        <label htmlFor={name} className={`form-label ${hasError ? "error" : ""}`}>
          <span>{label}</span>
          {isRequired && <span className="required-indicator">*</span>}
        </label>
        {type === "textarea" ? (
          <textarea
            id={name}
            name={name}
            value={formData[name]}
            onChange={handleChange}
            placeholder={placeholder}
            className={`form-input ${hasError ? "input-error" : ""}`}
            rows={3}
          />
        ) : type === "select" ? (
          <select
            id={name}
            name={name}
            value={formData[name]}
            onChange={handleChange}
            className={`form-input ${hasError ? "input-error" : ""}`}
          >
            <option value="">Select an option</option>
            {options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : (
          <input
            id={name}
            type={type}
            name={name}
            value={formData[name]}
            onChange={handleChange}
            placeholder={placeholder}
            className={`form-input ${hasError ? "input-error" : ""}`}
          />
        )}
        {hasError && <div className="error-message">This field is required</div>}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="course-form">
      <div className="form-header">
        <div>
          <div className="eyebrow">CREATE COURSE FILE</div>
          <h3>{educatorName}</h3>
          <p className="form-subtitle">All fields marked with <span className="required-indicator">*</span> are required</p>
        </div>
      </div>

      <div className="form-section">
        {renderField("Faculty Owner", "faculty", "text", undefined, "e.g., Dr. Timothy Adams")}
        {renderField("Course Title", "title", "text", undefined, "e.g., Craniofacial Biodentistry & Advanced Airway Integration")}
        {renderField(
          "Format",
          "format",
          "select",
          ["Digital", "In-Office", "Online", "Hybrid"]
        )}
        {renderField("Target Audience", "audience", "text", undefined, "e.g., Dental professionals, practitioners, students")}
        {renderField(
          "Educational Need",
          "educationalNeed",
          "textarea",
          undefined,
          "Describe the clinical problem or learning objective this course addresses..."
        )}
      </div>

      <div className="form-actions">
        <button
          type="submit"
          className="btn primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating…" : "COURSE REGISTER"}
        </button>
        {onCancel && (
          <button
            type="button"
            className="btn secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
      </div>

      {submitMessage && (
        <div className={`submit-message ${submitMessage.startsWith("✓") ? "success" : "error"}`}>
          {submitMessage}
        </div>
      )}

      <style jsx>{`
        .course-form {
          background: var(--bg-secondary, #f9f9f9);
          border: 1px solid var(--line, #e5e5e5);
          border-radius: 8px;
          padding: 28px;
          max-width: 600px;
        }

        .form-header {
          margin-bottom: 28px;
          border-bottom: 1px solid var(--line, #e5e5e5);
          padding-bottom: 20px;
        }

        .form-header .eyebrow {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted, #666);
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .form-header h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary, #000);
        }

        .form-subtitle {
          margin: 0;
          font-size: 13px;
          color: var(--text-muted, #666);
          line-height: 1.4;
        }

        .required-indicator {
          color: #e74c3c;
          font-weight: 600;
          margin-left: 4px;
        }

        .form-section {
          display: flex;
          flex-direction: column;
          gap: 18px;
          margin-bottom: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary, #000);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .form-label.error {
          color: #e74c3c;
        }

        .form-input {
          padding: 10px 12px;
          border: 1px solid var(--line, #ddd);
          border-radius: 4px;
          font-size: 13px;
          font-family: inherit;
          background: white;
          color: var(--text-primary, #000);
          transition: all 0.2s ease;
        }

        .form-input:focus {
          outline: none;
          border-color: #4a90e2;
          box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
        }

        .form-input.input-error {
          border-color: #e74c3c;
          background-color: rgba(231, 76, 60, 0.02);
        }

        .form-input.input-error:focus {
          box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
        }

        .error-message {
          font-size: 12px;
          color: #e74c3c;
          margin-top: 2px;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .form-actions .btn {
          flex: 1;
          padding: 12px 20px;
          border: none;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .form-actions .btn.primary {
          background: #2c3e50;
          color: white;
        }

        .form-actions .btn.primary:hover:not(:disabled) {
          background: #1a252f;
        }

        .form-actions .btn.secondary {
          background: var(--bg-secondary, #f5f5f5);
          color: var(--text-primary, #000);
          border: 1px solid var(--line, #ddd);
        }

        .form-actions .btn.secondary:hover:not(:disabled) {
          background: var(--bg-hover, #e8e8e8);
        }

        .form-actions .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .submit-message {
          padding: 12px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          text-align: center;
        }

        .submit-message.success {
          background: rgba(46, 204, 113, 0.1);
          color: #27ae60;
          border: 1px solid rgba(46, 204, 113, 0.3);
        }

        .submit-message.error {
          background: rgba(231, 76, 60, 0.1);
          color: #c0392b;
          border: 1px solid rgba(231, 76, 60, 0.3);
        }
      `}</style>
    </form>
  );
}

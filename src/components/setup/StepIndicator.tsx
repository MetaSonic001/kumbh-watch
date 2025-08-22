import { CheckCircle, Circle } from "lucide-react";
import { motion } from "framer-motion";

interface Step {
  number: number;
  title: string;
  description: string;
}

interface StepIndicatorProps {
  currentStep: number;
  completedSteps: number[];
  steps: Step[];
}

const StepIndicator = ({ currentStep, completedSteps, steps }: StepIndicatorProps) => {
  const isStepCompleted = (stepNumber: number) => completedSteps.includes(stepNumber);
  const isStepCurrent = (stepNumber: number) => currentStep === stepNumber;
  
  return (
    <div className="flex items-center justify-between w-full max-w-4xl mx-auto">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center flex-1">
          {/* Step Circle */}
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`
                relative w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300
                ${isStepCompleted(step.number) 
                  ? 'bg-success border-success text-success-foreground' 
                  : isStepCurrent(step.number)
                  ? 'bg-primary border-primary text-primary-foreground shadow-glow'
                  : 'bg-background border-muted text-muted-foreground'
                }
              `}
            >
              {isStepCompleted(step.number) ? (
                <CheckCircle className="w-6 h-6" />
              ) : (
                <Circle className="w-6 h-6" />
              )}
              
              {/* Step Number */}
              <div className={`
                absolute inset-0 flex items-center justify-center text-sm font-bold
                ${isStepCompleted(step.number) ? 'text-success-foreground' : ''}
              `}>
                {!isStepCompleted(step.number) && step.number}
              </div>
            </motion.div>
            
            {/* Step Info */}
            <div className="mt-3 text-center max-w-32">
              <h4 className={`
                text-sm font-semibold 
                ${isStepCurrent(step.number) ? 'text-primary' : 'text-muted-foreground'}
              `}>
                {step.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-1 leading-tight">
                {step.description}
              </p>
            </div>
          </div>
          
          {/* Connector Line */}
          {index < steps.length - 1 && (
            <motion.div 
              initial={{ scaleX: 0 }}
              animate={{ 
                scaleX: isStepCompleted(step.number) ? 1 : isStepCurrent(step.number) ? 0.5 : 0 
              }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`
                h-0.5 flex-1 mx-4 origin-left transition-colors duration-300
                ${isStepCompleted(step.number) ? 'bg-success' : 'bg-muted'}
              `}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default StepIndicator;
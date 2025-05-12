import React from 'react';

export interface FeedbackDisplayProps {
  userRole: string; // Add this property
}

const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({ userRole }) => {
  return (
    <div>
      <h1>Feedback for {userRole}</h1>
      {/* Add the logic to display feedback based on userRole */}
    </div>
  );
};

export default FeedbackDisplay;

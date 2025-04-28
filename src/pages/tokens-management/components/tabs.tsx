// src/components/tabs.tsx

import React from "react";

interface TabProps {
  value: string;
  label: string;
  icon?: string;
}

interface TabsProps {
  value: string;
  onValueChange: (val: string) => void;
  children: React.ReactElement<TabProps>[];
  className?: string;
}

export const TabsX: React.FC<TabsProps> = ({ value, onValueChange, children, className }) => {
  return (
    <div className={`${className} border-b border-gray-200`}>
      <ul className="flex flex-wrap -mb-px">
        {children.map((tab) => (
          <li key={tab.props.value} className="mr-2">
            <button
              className={`inline-block p-4 border-b-2 rounded-t-lg transition-all duration-300 ${
                value === tab.props.value
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent hover:text-gray-600 hover:border-gray-300"
              }`}
              onClick={() => onValueChange(tab.props.value)}
            >
              {tab.props.icon && <i className={`fas fa-${tab.props.icon} mr-2`}></i>}
              {tab.props.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const TabX: React.FC<TabProps> = () => null;

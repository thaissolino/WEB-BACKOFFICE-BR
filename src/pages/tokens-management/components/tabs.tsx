import React from "react";

interface Tab {
  value: string;
  label: string;
  icon?: string; // FontAwesome class
}

interface TabsProps {
  value: string;
  onValueChange: (val: string) => void;
  children: React.ReactElement<TabProps>[];
  className?: string;
}

interface TabProps {
  value: string;
  label: string;
  icon?: string;
}

export const TabsX: React.FC<TabsProps> = ({ value, onValueChange, children, className }) => {
  return (
    <div className={className}>
      <ul className="flex flex-wrap border-b border-gray-200 -mb-px">
        {children.map((tab) => (
          <li key={tab.props.value} className="mr-2">
            <button
              className={`inline-block p-4 border-b-2 rounded-t-lg ${
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

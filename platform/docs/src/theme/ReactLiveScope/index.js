import React from 'react';
import { useState } from 'react';
// import ToolbarButton from '../../../../ui/src/components/ToolbarButton/ToolbarButton';
// import { ToolbarButton } from '@ohif/ui';
import classnames from 'classnames';

const ButtonExample = (props) => (
  <button
    {...props}
    style={{
      backgroundColor: 'white',
      border: 'solid red',
      borderRadius: 20,
      padding: 10,
      cursor: 'pointer',
      ...props.style,
    }}
  />
);

const Table = ({ children, className, fullWidth, style }) => {
  const classes = {
    base: 'text-lg text-white',
    fullWidth: {
      true: 'w-full',
      false: '',
    },
  };

  return (
    <div
      className={classnames(
        classes.base,
        classes.fullWidth[fullWidth],
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
};


const ListMenu = (props) => {
  return (
    <ToolbarButton items={[
      { value: 'windowLevelPreset1', title: 'Soft tissue', subtitle: '400 / 40' },
      { value: 'windowLevelPreset2', title: 'Lung', subtitle: '1500 / -600' },
      { value: 'windowLevelPreset3', title: 'Liver', subtitle: '150 / 90' },
      { value: 'windowLevelPreset4', title: 'Bone', subtitle: '80 / 40' },
      { value: 'windowLevelPreset5', title: 'Brain', subtitle: '2500 / 480' },
    ]}
      renderer={
        ({ title, subtitle, isActive, index }) => (
          <>
            <div>
              <span className={classnames(isActive ? "text-black" : "text-white", "mr-2 text-base")}>
                {title}
              </span>
              <span className={classnames(isActive ? "text-black" : "text-aqua-pale", "font-thin text-sm")}>
                {subtitle}
              </span>
            </div>
            <span className={classnames(isActive ? "text-black" : "text-primary-active", "text-sm")}>{index + 1}</span>
          </>
        )}
    />
  );
}


// Add react-live imports you need here
const ReactLiveScope = {
  React,
  ...React,
  ButtonExample,
  ListMenu,
  Table
};

export default ReactLiveScope;

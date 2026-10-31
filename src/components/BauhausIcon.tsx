import React from 'react';
import { addCollection, getIcon } from '@iconify/react';
import withiconsBauhaus from '@iconify-json/withicons-bauhaus/icons.json';

// Register the Bauhaus icon collection locally so all icons render instantly offline
addCollection(withiconsBauhaus as any);

export interface BauhausIconProps extends React.SVGProps<SVGSVGElement> {
  name: string;
  className?: string;
  size?: number | string;
}

export const BauhausIcon: React.FC<BauhausIconProps> = ({
  name,
  className = 'w-5 h-5',
  size,
  style,
  ...props
}) => {
  const cleanName = name.replace(/^withicons-bauhaus:/, '');
  const iconData = getIcon(`withicons-bauhaus:${cleanName}`) || getIcon('withicons-bauhaus:sparkles');

  if (!iconData) {
    return null;
  }

  const left = iconData.left || 0;
  const top = iconData.top || 0;
  const width = iconData.width || 24;
  const height = iconData.height || 24;

  return (
    <svg
      viewBox={`${left} ${top} ${width} ${height}`}
      width={size}
      height={size}
      className={`inline-block shrink-0 ${className}`}
      style={style}
      role="img"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: iconData.body }}
      {...props}
    />
  );
};

export const createBauhausIcon = (name: string) => {
  const IconComponent: React.FC<Omit<BauhausIconProps, 'name'>> = (props) => (
    <BauhausIcon name={name} {...props} />
  );
  IconComponent.displayName = `Bauhaus_${name}`;
  return IconComponent;
};

// Named Bauhaus icon exports for direct, clean usage across the application
export const BauhausLayoutDashboard = createBauhausIcon('layout-dashboard');
export const BauhausHome = createBauhausIcon('home');
export const BauhausClock = createBauhausIcon('clock');
export const BauhausTimer = createBauhausIcon('timer');
export const BauhausCalendar = createBauhausIcon('calendar');
export const BauhausCalendarCheck = createBauhausIcon('calendar-check');
export const BauhausCalendarDays = createBauhausIcon('calendar-days');
export const BauhausCalendarClock = createBauhausIcon('calendar-clock');
export const BauhausArchive = createBauhausIcon('archive');
export const BauhausUser = createBauhausIcon('user');
export const BauhausUsers = createBauhausIcon('users');
export const BauhausUserPlus = createBauhausIcon('user-plus');
export const BauhausUserCheck = createBauhausIcon('user-check');
export const BauhausUserCog = createBauhausIcon('user-cog');
export const BauhausGraduationCap = createBauhausIcon('graduation-cap');
export const BauhausFile = createBauhausIcon('file');
export const BauhausFileText = createBauhausIcon('file-text');
export const BauhausFileChart = createBauhausIcon('file-chart');
export const BauhausFileCheck = createBauhausIcon('file-check');
export const BauhausBrain = createBauhausIcon('brain');
export const BauhausBrainCircuit = createBauhausIcon('brain-circuit');
export const BauhausBuilding = createBauhausIcon('building');
export const BauhausBuilding2 = createBauhausIcon('building-2');
export const BauhausBriefcase = createBauhausIcon('briefcase');
export const BauhausBriefcaseBusiness = createBauhausIcon('briefcase-business');
export const BauhausAward = createBauhausIcon('award');
export const BauhausShield = createBauhausIcon('shield');
export const BauhausShieldCheck = createBauhausIcon('shield-check');
export const BauhausBell = createBauhausIcon('bell');
export const BauhausBellDot = createBauhausIcon('bell-dot');
export const BauhausSettings = createBauhausIcon('settings');
export const BauhausLock = createBauhausIcon('lock');
export const BauhausKey = createBauhausIcon('key');
export const BauhausEye = createBauhausIcon('eye');
export const BauhausEyeOff = createBauhausIcon('eye-off');
export const BauhausCheck = createBauhausIcon('check');
export const BauhausCheckCircle = createBauhausIcon('check-circle');
export const BauhausBadgeCheck = createBauhausIcon('badge-check');
export const BauhausAlertCircle = createBauhausIcon('alert-circle');
export const BauhausAlertTriangle = createBauhausIcon('alert-triangle');
export const BauhausSearch = createBauhausIcon('search');
export const BauhausFilter = createBauhausIcon('filter');
export const BauhausArrowRight = createBauhausIcon('arrow-right');
export const BauhausArrowLeft = createBauhausIcon('arrow-left');
export const BauhausArrowLeftRight = createBauhausIcon('arrow-left-right');
export const BauhausChevronRight = createBauhausIcon('chevron-right');
export const BauhausChevronLeft = createBauhausIcon('chevron-left');
export const BauhausChevronDown = createBauhausIcon('chevron-down');
export const BauhausChevronUp = createBauhausIcon('chevron-up');
export const BauhausPlus = createBauhausIcon('plus');
export const BauhausPlusCircle = createBauhausIcon('plus-circle');
export const BauhausTrash = createBauhausIcon('trash');
export const BauhausTrash2 = createBauhausIcon('trash-2');
export const BauhausRotateCw = createBauhausIcon('rotate-cw');
export const BauhausRotateCcw = createBauhausIcon('rotate-ccw');
export const BauhausHistory = createBauhausIcon('history');
export const BauhausSparkles = createBauhausIcon('sparkles');
export const BauhausMenu = createBauhausIcon('menu');
export const BauhausClose = createBauhausIcon('close');
export const BauhausX = createBauhausIcon('close');
export const BauhausLogIn = createBauhausIcon('log-in');
export const BauhausLogOut = createBauhausIcon('log-out');
export const BauhausMail = createBauhausIcon('mail');
export const BauhausPhone = createBauhausIcon('phone');
export const BauhausMapPin = createBauhausIcon('map-pin');
export const BauhausCoffee = createBauhausIcon('coffee');
export const BauhausActivity = createBauhausIcon('activity');

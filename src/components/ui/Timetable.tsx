import React from 'react';
import { cn } from '@/utils/cn';
import { Lock } from 'lucide-react';

interface TimetableSlotProps {
  subjectCode?: string;
  subjectName?: string;
  staffCode?: string;
  staffName?: string;
  room?: string;
  type?: 'theory' | 'lab' | 'break' | 'lunch' | 'locked' | 'empty';
  className?: string;
}

export function TimetableSlot({ 
  subjectCode, 
  subjectName, 
  staffCode, 
  staffName, 
  room, 
  type = 'empty',
  className
}: TimetableSlotProps) {
  
  if (type === 'break' || type === 'lunch') {
    return (
      <div className={cn("h-full w-full flex items-center justify-center rounded-lg bg-gray-50 border border-gray-100 text-gray-400 font-medium tracking-widest text-sm", className)}>
        {type.toUpperCase()}
      </div>
    );
  }

  if (type === 'empty') {
    return (
      <div className={cn("h-full w-full rounded-lg border border-dashed border-gray-200 bg-transparent flex items-center justify-center", className)}>
        <span className="text-gray-300 text-xs">-</span>
      </div>
    );
  }

  if (type === 'locked') {
    return (
      <div className={cn("h-full w-full flex flex-col items-center justify-center rounded-lg bg-luna-deep-blue text-white p-2 text-center shadow-sm relative overflow-hidden border border-luna-cyan", className)}>
        <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: 'linear-gradient(45deg, #A7EBF2 25%, transparent 25%, transparent 50%, #A7EBF2 50%, #A7EBF2 75%, transparent 75%, transparent)' }}></div>
        <Lock className="w-4 h-4 text-luna-light-cyan mb-1 z-10" />
        <span className="font-bold text-sm tracking-wide z-10">{subjectName}</span>
        <span className="text-xs text-luna-light-cyan mt-1 font-medium z-10">{subjectCode}</span>
      </div>
    );
  }

  return (
    <div className={cn("h-full w-full flex flex-col justify-between rounded-lg bg-white border border-gray-200 p-2 sm:p-3 shadow-sm hover:border-luna-primary-blue hover:shadow-md transition-all cursor-default", className)}>
      <div>
        <div className="flex justify-between items-start">
          <span className="font-bold text-luna-dark-navy text-xs sm:text-sm">{subjectCode}</span>
          <span className="bg-luna-light-cyan/30 text-luna-primary-blue text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded">
            {room}
          </span>
        </div>
        <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-tight">{subjectName}</p>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
        <span className="text-xs font-medium text-luna-primary-blue">{staffCode}</span>
        <span className="text-[10px] text-gray-500 truncate ml-1">{staffName}</span>
      </div>
    </div>
  );
}

export function TimetableGrid() {
  const timeSlots = [
    { time: '09:10 - 10:00', type: 'class' },
    { time: '10:00 - 10:50', type: 'class' },
    { time: '10:50 - 11:10', type: 'break' },
    { time: '11:10 - 12:00', type: 'class' },
    { time: '12:00 - 12:50', type: 'class' },
    { time: '12:50 - 01:40', type: 'lunch' },
    { time: '01:40 - 02:30', type: 'class' },
    { time: '02:30 - 03:20', type: 'class' },
    { time: '03:20 - 04:20', type: 'class' },
  ];
  
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="min-w-[800px]">
        {/* Header Row */}
        <div className="grid grid-cols-6 gap-2 mb-2">
          <div className="flex items-center justify-center font-semibold text-gray-500 text-sm p-2">TIME</div>
          {days.map(day => (
            <div key={day} className="flex items-center justify-center font-bold text-luna-dark-navy p-2 bg-gray-50 rounded-lg border border-gray-100">
              {day}
            </div>
          ))}
        </div>

        {/* Time Slots */}
        <div className="space-y-2">
          {timeSlots.map((slot, index) => (
            <div key={index} className="grid grid-cols-6 gap-2 h-28 sm:h-32">
              <div className="flex items-center justify-center text-xs font-medium text-gray-500 bg-gray-50 rounded-lg border border-gray-100 px-2 text-center">
                {slot.time}
              </div>
              
              {slot.type === 'break' || slot.type === 'lunch' ? (
                <div className="col-span-5">
                  <TimetableSlot type={slot.type} />
                </div>
              ) : (
                days.map((day) => {
                  // Example fixed condition for Naan Mudhalvan
                  if (day === 'WED' && index >= 6 && index <= 7) {
                    return (
                      <div key={`${day}-${index}`}>
                        <TimetableSlot 
                          type="locked" 
                          subjectName="NAAN MUDHALVAN" 
                          subjectCode="FIXED SESSION" 
                        />
                      </div>
                    );
                  }
                  
                  // Dummy population
                  if ((index === 0 && day === 'MON') || (index === 1 && day === 'TUE')) {
                     return (
                      <div key={`${day}-${index}`}>
                        <TimetableSlot 
                          type="theory" 
                          subjectCode="CS3501" 
                          subjectName="Compiler Design"
                          staffCode="JT"
                          staffName="Mrs. J. Tamilarsi"
                          room="304"
                        />
                      </div>
                    );
                  }
                  
                  return (
                    <div key={`${day}-${index}`}>
                      <TimetableSlot type="empty" />
                    </div>
                  );
                })
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

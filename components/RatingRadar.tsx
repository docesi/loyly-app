import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { Ratings } from '../types';

interface RatingRadarProps {
  ratings: Ratings;
}

const RatingRadar: React.FC<RatingRadarProps> = ({ ratings }) => {
  // Normalize data to 0-100 scale for the chart
  const parseRating = (val: string, max: number) => {
      if (!val) return 0;
      const [score] = val.split('/').map(Number);
      return (score / max) * 100;
  };

  const data = [
    { subject: 'Löylyt', A: parseRating(ratings.loylyt, 25), fullMark: 100 },
    { subject: 'Miljöö', A: parseRating(ratings.miljoo, 4), fullMark: 100 },
    { subject: 'Ilmapiiri', A: parseRating(ratings.ilmapiiri, 3), fullMark: 100 },
    { subject: 'Hinta', A: parseRating(ratings.hinta, 3), fullMark: 100 },
    { subject: 'Saavut.', A: parseRating(ratings.saavutettavuus, 3), fullMark: 100 },
    { subject: 'Palvelut', A: parseRating(ratings.oheispalvelut, 3), fullMark: 100 },
  ];

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563', fontSize: 10 }} />
          <Radar
            name="Rating"
            dataKey="A"
            stroke="#c77e4e"
            fill="#d49763"
            fillOpacity={0.5}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RatingRadar;
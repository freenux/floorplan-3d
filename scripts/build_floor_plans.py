"""Reconstruct the scanned PDF (pages 7/8), using labelled axes in mm.
Unlabelled partitions/openings/furniture are manually estimated, not CAD extraction.
"""
import json
from pathlib import Path
import math
import re

OUT = Path(__file__).resolve().parents[1] / 'plans'

def build(level):
    rooms, walls, windows, doors, furniture = [], [], [], [], []
    def room(id, name, box, mat='tile800', outdoor=False):
        x0,y0,x1,y1=box
        rooms.append(dict(id=id,name=name,poly=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]],mat=mat,at=[(x0+x1)/2,(y0+y1)/2],outdoor=outdoor))
    def h(y,x0,x1,k='n'): walls.append([x0,y-100,x1,y+100,k])
    def v(x,y0,y1,k='n'): walls.append([x-100,y0,x+100,y1,k])
    def wh(y,x0,x1): windows.append([x0,y-100,x1,y+100])
    def wv(x,y0,y1): windows.append([x-100,y0,x+100,y1])
    def door_v(x,y0,y1,name,open_dir=-1):
        doors.append(dict(name=name,rect=[x-100,y0,x+100,y1],h=[x,y1],c=[0,-1],o=[open_dir,0],len=y1-y0))
    def door_h(y,x0,x1,name,entry=False):
        doors.append(dict(name=name,rect=[x0,y-100,x1,y+100],h=[x0,y],c=[1,0],o=[0,-1],len=x1-x0,entry=entry))
    def f(type,name,x,y,w,d,rot=0):
        colors={'bed':'#c9d6df','sofa':'#b7c4b0','wardrobe':'#efe6d8','toilet':'#ffffff','counter':'#e9e5de'}
        furniture.append(dict(id=f'f{level}_{len(furniture)+1}',type=type,name=name,cx=x,cy=y,w=w,d=d,rot=rot,color=colors.get(type,'#e2cfb4')))
    # Axis lines: 1..4 = 0/4000/8000/12000; A=0, B=3000,C=3900,D=5500.
    # 200mm wall thickness is estimated; no bearing-wall classification inferred.
    for a,b in [(0,1150),(2950,5150),(6950,9150),(10950,12000)]: h(0,a,b,'e')
    for a,b in [(1150,2950),(5150,6950),(9150,10950)]: wh(0,a,b)
    v(0,0,4000,'e');wv(0,4100,5000);v(0,5100,11800,'e')
    v(12000,0,3800,'e');wv(12000,3800,4800);v(12000,4800,11000,'e')
    v(4000,100,2750);door_v(4000,2750,3650,'上左卧室门');v(4000,3650,3900)
    h(3900,100,4100)
    v(4000,3900,4100);door_v(4000,4100,5100,'卫生间门');v(4000,5100,5500)
    h(5500,100,4100)
    v(8000,100,600);door_v(8000,600,1600,'厨房门' if level==1 else '书房门',1);v(8000,1600,3000)
    h(3000,7900,11900)
    room('bed_nw','卧室（上左）',[100,100,3900,3800],'wood')
    room('bath','卫生间',[100,4000,3900,5400],'antislip')
    room('north_middle','卧室（图示餐桌）' if level==1 else '客厅北侧空间',[4100,100,7900,3000])
    room('kitchen' if level==1 else 'study','厨房' if level==1 else '书房',[8100,100,11900,2900],'antislip' if level==1 else 'wood')
    room('stair','楼梯间',[8100,3100,11900,5400],'tile600')
    room('hall','过厅',[4100,3000,8000,5400])
    # Lower left bedroom ends at E=9500 (1F), E=8500 (2F).
    end=9500 if level==1 else 8500
    door_v(4000,5700,6700,'下左卧室门');v(4000,5500,5700);v(4000,6700,end)
    room('bed_sw','卧室（下左）',[100,5600,3900,end-100],'wood')
    for x,y in [(1300,1950),(1300,7300 if level==1 else 7050)]:
        f('bed','双人床',x,y,1800 if level==1 else 1500,2000,270)
        f('nightstand','床头柜',450,y-1300,550,500)
        f('nightstand','床头柜',450,y+1300,550,500)
    f('wardrobe','衣柜',3500,1500,2000,600,90)
    f('wardrobe','衣柜',3500,end-1100,1800,600,90)
    f('toilet','马桶',650,4550,400,700)
    f('vanity','洗手盆',3450,5100,700,450)
    if level==1:
        h(9500,100,3900);wh(9500,900,2900)
        # Remove the solid section beneath the bedroom window.
        walls[:]=[w for w in walls if w != [100,9400,3900,9600,'n']]
        h(9500,100,900);h(9500,2900,4800);h(9500,7200,8000)
        door_h(9500,4800,6000,'入户门左扇',True)
        doors.append(dict(name='入户门右扇',rect=[6000,9400,7200,9600],h=[7200,9500],c=[-1,0],o=[0,-1],len=1200,entry=True))
        v(8000,9500,11800,'e');h(11000,7900,12000,'e')
        # The porch front is open; the drawing's dashed boundary is not a wall.
        room('living','客厅',[4100,5600,11900,9400])
        room('living_south','客厅南侧',[8100,9400,11900,10900])
        room('porch','门廊',[100,9600,7900,11700],'tile600',True)
        f('roundtable','餐桌（按图示）',6000,1700,1600,1600)
        for angle in range(0,360,45):
            a=math.radians(angle);f('chair','餐椅',round(6000+1100*math.cos(a)),round(1700+1100*math.sin(a)),450,480,(angle+90)%360)
        f('counter','厨房台面',10000,450,3300,600)
        f('counter','厨房台面',11550,1750,2300,600,90)
        f('stove','燃气灶',10600,450,750,450)
        f('ksink','厨房水槽',11550,1550,800,450,90)
        f('sofa','三人沙发',9900,10450,2700,800)
        f('armchair','单人沙发',11600,10300,650,650)
        f('armchair','单人沙发',8500,9500,650,850)
        f('coffeetable','茶几',9900,9500,1000,600)
        f('tvstand','电视柜',9900,5800,2300,350)
        dims_y=[3900,1600,4000,1500,800]
        start=dict(position=[6000,10900],target=[6000,7000])
    else:
        h(8500,100,900);wh(8500,900,2900);h(8500,2900,4800);h(8500,7200,8000)
        door_h(8500,4800,6000,'露台门左扇')
        doors.append(dict(name='露台门右扇',rect=[6000,8400,7200,8600],h=[7200,8500],c=[-1,0],o=[0,1],len=1200))
        h(5500,8000,11900)
        v(8000,5500,5600);door_v(8000,5600,6600,'下右卧室门',1);v(8000,6600,11000)
        h(11000,8000,9000,'e');wh(11000,9000,10900);h(11000,10900,12000,'e')
        v(8000,11000,11800,'low');h(11800,0,8000,'low')
        # Terrace left edge is a parapet, not a full-height wall.
        walls[:]=[w for w in walls if w != [-100,5100,100,11800,'e']]
        v(0,5100,8500,'e');v(0,8500,11800,'low')
        room('living','客厅',[4100,5600,7900,8400])
        room('bed_se','卧室（下右）',[8100,5600,11900,10900],'wood')
        room('terrace','露台',[100,8600,7900,11700],'antislip',True)
        f('bed','双人床',10500,8050,1800,2000,90)
        f('nightstand','床头柜',11500,6750,550,500)
        f('nightstand','床头柜',11500,9350,550,500)
        f('wardrobe','衣柜',8500,10000,1800,600,90)
        dims_y=[3900,1600,3000,2500,800]
        start=dict(position=[5900,7300],target=[5900,4000])
    geometry=dict(walls=walls,windows=windows,doors=doors,slides=[],rooms=rooms,
        stairs=[dict(rect=[8000,4350,10600,5350],steps=9,reverse=False,baseHeight=0,height=1.4),dict(rect=[8000,3150,10600,4150],steps=9,reverse=True,baseHeight=1.4,height=1.4)],
        dimensions=[dict(horizontal=True,at=-750,start=0,segments=[4000,4000,4000]),dict(horizontal=True,at=-1250,start=0,segments=[12000]),dict(horizontal=False,at=-800,start=0,segments=dims_y),dict(horizontal=False,at=-1400,start=0,segments=[11800]),dict(horizontal=False,at=12800,start=0,segments=[3000,2500,5500,800])],walkStart=start)
    notes=[
        '扫描图人工重建；轴线尺寸按原图标注，未标尺寸按图估算。',
        '坐标单位毫米；原点为轴线1/A，x向右，y向下。墙体按轴线中心及200mm估算墙厚。',
        '门窗净宽、分隔墙偏移、家具尺寸及位置为估算，不能用于施工放样。',
        '未判断承重墙，n仅为编辑器内部墙体类型，不代表实际可拆。',
        '楼梯为示意模型，不含楼板洞口、扶手、精确层高或可步行上下楼功能；3D沿用项目2.8m展示高度。',
        '各楼层分别导入，不包含叠层模型或屋顶；二楼右上角为屋顶示意，未当作房间。',
        '图纸建筑面积含墙体等，项目统计为重建平面净面积（含门廊/露台），口径不同。',
        '地面材质为展示用默认值，不是原图材料说明。',
    ]
    if level==1:
        notes.append('一楼上中房原文为卧室，但符号为圆餐桌，保留原图名称并注明图示。')
        notes.append('一楼门廊前缘为开放边界，不生成矮墙或围栏。')
    return dict(format='floorplan-3d',version=2,metadata=dict(geometryRevision=1,name=f'plan-floor{level}',source='设计图.pdf',sourcePage=6+level,sourceSheet='JS-04' if level==1 else 'JS-05',sourceScale='1:100',floor=level,sourceBuildingAreaM2=138.40 if level==1 else 114.06,sourceFloorElevationMm=0 if level==1 else 4100,accuracy='dimension-calibrated-manual-reconstruction',notes=notes),geometry=geometry,furniture=furniture,rooms={r['id']:dict(name=r['name'],mat=r['mat']) for r in rooms},demolished=[],measures=[])

if __name__=='__main__':
    OUT.mkdir(exist_ok=True)
    for level in (1,2):
        (OUT / f'plan-floor{level}.json').write_text(json.dumps(build(level),ensure_ascii=False,indent=2)+'\n')

    # Keep the portable single-file page's initial plan list in sync with the JSON files.
    page = OUT.parent / 'index.html'
    source = page.read_text()
    bundled = [dict(id=f'plan-floor{level}',name=build(level)['metadata']['name'],state=build(level)) for level in (1,2)]
    payload = json.dumps(bundled,ensure_ascii=False,separators=(',',':')).replace('<',r'\u003c')
    source = re.sub(r'(<script type="application/json" id="bundledPlans">)[\s\S]*?(</script>)',lambda m:m[1]+payload+m[2],source,count=1)
    page.write_text(source)
